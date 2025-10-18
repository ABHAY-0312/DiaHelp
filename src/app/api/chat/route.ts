
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
  model: 'gemini-2.5-pro'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, reportContext } = ChatInputSchema.parse(body);

    const prompt = `You are a friendly and knowledgeable digital health assistant for DiaHelper. Your goal is to be a helpful, informative, and supportive resource for the user. Respond with ONLY a valid JSON object that conforms to the following schema:

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
- **Use the Report as Primary Context:** The user is asking about their personalized report. Base your answers on the information provided in the "Report Context" below.
- **Provide General Knowledge When Needed:** If the user asks for a definition or explanation of a health term (like "What is BMI?" or "What are carbohydrates?"), you MUST provide a clear and direct answer using your general knowledge. Do not deflect or tell the user you cannot answer.
- **Be Direct and Empowering:** Answer the user's questions directly. Your tone should be positive, encouraging, and clear. Avoid clinical jargon where possible.

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
