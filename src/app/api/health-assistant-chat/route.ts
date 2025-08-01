
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
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
    const input = HealthAssistantChatInputSchema.parse(body);

    const prompt = `You are a friendly and knowledgeable digital health assistant for DiaHelper.

Your role is to answer a wide range of general educational questions about health, nutrition, exercise, and diabetes.

- **Be Informative and Direct:** Your goal is to provide clear, accurate, and direct answers to the user's questions. Use your extensive knowledge base.
- **Maintain a Supportive Tone:** Your responses should be encouraging, easy to understand, and positive.
- **Answer the Question:** Directly address the user's query. Do not deflect or avoid answering if the topic is within the general scope of health and wellness.

User's Question:
---
${input.question}
---
`;

    const result = await model.generateContent(prompt);
    const responseJson = JSON.parse(result.response.text());

    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Health assistant chat failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
