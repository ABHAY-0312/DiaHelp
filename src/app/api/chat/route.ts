
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

const ChatInputSchema = z.object({
  question: z.string().describe("The user's question about their report."),
  reportContext: z.string().describe('The full text of the diabetes risk assessment report.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  answer: z.string().describe('The helpful answer from the AI assistant.'),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-pro'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, reportContext } = ChatInputSchema.parse(body);

    const prompt = `You are DiaHelper's digital health assistant. Respond with only a valid JSON object conforming to the ChatOutput schema.
Instructions:
- Use the provided Report Context as the primary source to answer the user's question.
- If the user asks for a general health term definition (e.g., "What is BMI?"), provide a clear, direct answer.
- Maintain a direct, empowering, and encouraging tone. Avoid clinical jargon.

Report Context:
---
${reportContext}
---

User's Question:
---
${question}
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
    console.error("Chatbot failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
