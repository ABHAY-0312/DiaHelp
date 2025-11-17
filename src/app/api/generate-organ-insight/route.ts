
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

const GenerateOrganInsightInputSchema = z.object({
  organ: z.string().describe('The name of the organ (e.g., "pancreas", "liver").'),
  riskFactor: z.string().describe('The primary health risk factor associated with this organ for the user (e.g., "High BMI", "Elevated Glucose").'),
});
export type GenerateOrganInsightInput = z.infer<typeof GenerateOrganInsightInputSchema>;

const GenerateOrganInsightOutputSchema = z.object({
  insight: z.string().describe("A brief, 1-2 sentence insight about how the specified risk factor affects the organ's health, written in an encouraging and educational tone."),
});
export type GenerateOrganInsightOutput = z.infer<typeof GenerateOrganInsightOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organ, riskFactor } = GenerateOrganInsightInputSchema.parse(body);

    const prompt = `Provide a concise, educational insight (1-2 sentences) on how "${riskFactor}" impacts the ${organ}. The tone should be encouraging. Respond with only a valid JSON object conforming to the GenerateOrganInsightOutput schema.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));
    
    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Organ insight generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
