
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

const ChatInputSchema = z.object({
  question: z.string(),
  reportContext: z.string(),
  formData: z.record(z.any()).optional(),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  answer: z.string(),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ]
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, reportContext, formData } = ChatInputSchema.parse(body);
    
    const prompt = `You are DiaHelper's digital health assistant. Your role is to answer the user's question based on the provided context.

**Normal Health Ranges for Reference:**
- **BMI**: 18.5 - 24.9
- **Fasting Glucose**: 70 - 100 mg/dL
- **HbA1c**: < 5.7%
- **Waist Circumference**: < 94 cm for males, < 80 cm for females
- **Triglycerides**: < 150 mg/dL
- **HDL Cholesterol**: > 40 mg/dL for males, > 50 mg/dL for females
- **Diastolic Blood Pressure**: < 80 mmHg
- **Sleep Hours**: 7 - 9 hours

**Context: User's Raw Health Data**
---
${JSON.stringify(formData, null, 2)}
---

**User's Question:**
"${question}"

**Instructions:**
1.  **If the user asks to "analyze" their "report"**:
    a.  Your ONLY task is to identify health metrics in the "User's Raw Health Data" that are outside of the "Normal Health Ranges".
    b.  You MUST respond with ONLY a bulleted list.
    c.  For each out-of-range metric, format the bullet point like this: "**Problem:** Your value is [User's Value], which is [above/below] the normal range of [Normal Range]. This means [simple explanation]."
    d.  Example: "**High BMI:** Your BMI is 28, which is above the healthy range of 18.5-24.9. This indicates you are in the overweight category."
    e.  DO NOT add any other explanations, advice, or introductory/concluding sentences. Just the list.
2.  **For any other question**: Answer the user's question directly based on general health knowledge or the data provided, in a friendly and conversational tone.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // The response is expected to be a JSON object string.
    // However, if the model fails to provide one, we wrap its response.
    let responseJson;
    try {
        responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));
    } catch (e) {
        responseJson = { answer: responseText };
    }


    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
     // Handle safety-related blocks from the model
    if (e.message && (e.message.includes('safety') || e.message.includes('blocked'))) {
      return NextResponse.json({ error: 'Inappropriate content detected', message: 'Your message was blocked due to safety settings. Please rephrase.' }, { status: 400 });
    }
    console.error("Chatbot failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
