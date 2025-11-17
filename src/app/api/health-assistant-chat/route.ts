
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

const HealthAssistantChatInputSchema = z.object({
  question: z.string().describe("The user's question about health or diabetes."),
});
export type HealthAssistantChatInput = z.infer<
  typeof HealthAssistantChatInputSchema
>;

const HealthAssistantChatOutputSchema = z.object({
  answer: z
    .string()
    .describe('The helpful, educational answer to the user question.'),
});
export type HealthAssistantChatOutput = z.infer<
  typeof HealthAssistantChatOutputSchema
>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-pro'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = HealthAssistantChatInputSchema.parse(body);

    const prompt = `You are an expert, friendly, and knowledgeable digital health assistant for DiaHelper. Provide a direct, clear, and accurate answer to the user's health question. Your tone should be supportive and easy to understand.
Respond with only a valid JSON object conforming to the HealthAssistantChatOutput schema.

User's Question:
---
${input.question}
---
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));


    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Health assistant chat failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
