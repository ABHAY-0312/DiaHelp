
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
    
    const prompt = `You are DiaHelper's digital health assistant. Your role is to answer the user's question.

**Context: User's Raw Health Data**
---
${JSON.stringify(formData, null, 2)}
---

**User's Question:**
"${question}"

**Instructions:**
1.  **If the user asks to "analyze" their "report"**:
    a.  Your ONLY task is to identify health metrics in the "User's Raw Health Data" that are outside of normal ranges (e.g., BMI > 25, Fasting Glucose > 100, HbA1c > 5.7%).
    b.  You MUST respond with ONLY a bulleted list of the problems.
    c.  Each bullet point MUST be bold (e.g., "**High BMI**", "**Elevated Fasting Glucose**").
    d.  DO NOT add any explanations, advice, or introductory sentences. Just the list.
2.  **For any other question**: Answer the user's question directly based on general health knowledge or the data provided.
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
