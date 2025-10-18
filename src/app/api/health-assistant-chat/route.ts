
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
  model: 'gemini-2.5-pro'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = HealthAssistantChatInputSchema.parse(body);

    const prompt = `You are an expert, friendly, and knowledgeable digital health assistant for DiaHelper. Respond with ONLY a valid JSON object that conforms to the following schema:

\`\`\`json
{
  "type": "object",
  "properties": {
    "answer": { "type": "string" }
  },
  "required": ["answer"]
}
\`\`\`

Here are your instructions:
Your role is to provide direct, clear, and accurate answers to a wide range of educational questions about health, nutrition, exercise, and diabetes.

- **Be a Knowledgeable Expert:** Use your extensive knowledge base to give informative and detailed answers.
- **Answer the Question Directly:** Address the user's query head-on. Do not deflect or avoid answering. If a user asks "What is BMI?", you should define it clearly and provide context about what it means for their health.
- **Maintain a Supportive and Clear Tone:** Your responses should be encouraging, easy to understand, and positive. Avoid overly clinical or complex language.

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
