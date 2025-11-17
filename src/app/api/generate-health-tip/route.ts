
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

const GenerateHealthTipOutputSchema = z.object({
  tip: z.string().describe("A concise, actionable, and encouraging health tip related to diet, exercise, or general wellness, suitable for someone managing diabetes risk."),
});
export type HealthTip = z.infer<typeof GenerateHealthTipOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash'
});

export async function GET(req: NextRequest) {
  try {
    const prompt = `Generate a single, interesting, actionable, and encouraging health tip (one sentence). Focus on nutrition, simple exercises, mindfulness, or hydration.
Respond with only a valid JSON object conforming to the GenerateHealthTipOutput schema.
Example: "Swapping white bread for whole-wheat is an easy way to boost your fiber intake!"`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));


    return NextResponse.json(responseJson);
  } catch (e: any) {
    console.error("Health tip generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
