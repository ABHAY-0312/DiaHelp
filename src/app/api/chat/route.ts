
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
    
    const prompt = `You are DiaHelper's digital health assistant. Your primary role is to answer the user's question accurately and concisely using the provided context. Maintain a direct, empowering, and encouraging tone. Avoid clinical jargon.

**Primary Context: Report Summary**
---
${reportContext}
---

**Secondary Context: User's Raw Health Data**
---
${JSON.stringify(formData, null, 2)}
---

**User's Question:**
"${question}"

**Instructions:**
1.  Read the user's question carefully.
2.  If the user asks for an analysis of their report (e.g., "analyze my report", "what's wrong?"), you MUST follow these steps:
    a.  Identify any health metrics in the "User's Raw Health Data" that are outside of normal ranges. For example, BMI > 25, Fasting Glucose > 100, HbA1c > 5.7%.
    b.  For each out-of-range metric, create a bolded heading (e.g., **Elevated Fasting Glucose**).
    c.  Under the heading, clearly state what is wrong in simple English (e.g., "Your fasting glucose is higher than the recommended level.").
    d.  Provide a separate paragraph with specific, actionable advice on how to improve THAT specific metric (e.g., "To help manage your glucose, you can try...").
    e.  Conclude the entire analysis with general prevention tips for long-term health and a disclaimer to consult a healthcare professional.
3.  If the user asks a general question, answer it based on the provided context.
4.  If the question is about a specific value (e.g., "what was my BMI?"), find it in the raw health data and provide it.
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
