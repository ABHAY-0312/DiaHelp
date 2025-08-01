
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

const GenerateHealthTipOutputSchema = z.object({
  tip: z.string().describe("A concise, actionable, and encouraging health tip related to diet, exercise, or general wellness, suitable for someone managing diabetes risk."),
});
export type HealthTip = z.infer<typeof GenerateHealthTipOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        tip: { type: 'string' },
      },
      required: ['tip'],
    },
  },
});

export async function GET(req: NextRequest) {
  try {
    const prompt = `You are a positive and motivating health coach.

Generate a single, interesting, and actionable health tip. The tip should be short (one sentence) and easy to understand. Focus on topics like nutrition, simple exercises, mindfulness, or hydration.

Keep the tone light and encouraging.

Example: "Swapping white bread for whole-wheat is an easy way to boost your fiber intake!"
`;

    const result = await model.generateContent(prompt);
    const responseJson = JSON.parse(result.response.text());

    return NextResponse.json(responseJson);
  } catch (e: any) {
    console.error("Health tip generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
