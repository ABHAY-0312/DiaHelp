
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
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
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        answer: { type: 'string' },
      },
      required: ['answer'],
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, reportContext } = ChatInputSchema.parse(body);

    const prompt = `You are a friendly and knowledgeable digital health assistant for DiaHelper.

Your primary role is to help users understand their personalized diabetes risk assessment report. Be encouraging, clear, and supportive.

- **Prioritize the Report:** Use the provided report context as the primary source of truth for your answers.
- **Use General Knowledge:** If the user asks a general health question (e.g., "What is BMI?", "What are carbohydrates?") that is related to the report but not fully explained within it, use your general medical knowledge to provide a clear and accurate definition.
- **Be Direct:** Provide direct answers. Avoid phrases like "I cannot answer that" or "I am just an AI."
- **Maintain a Supportive Tone:** Always be positive and empowering in your responses.

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
    const responseJson = JSON.parse(result.response.text());

    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Chatbot failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
