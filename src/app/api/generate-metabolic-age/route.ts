
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

const GenerateMetabolicAgeInputSchema = z.object({
  actualAge: z.number().describe('The chronological age of the user.'),
  bmi: z.number().describe('The BMI (Body Mass Index) of the user.'),
  glucose: z.number().describe('The plasma glucose concentration of the user.'),
  sleepHours: z.number().describe('The average hours of sleep per night for the user.'),
  fitnessLevel: z
    .enum(['sedentary', 'light', 'moderate', 'active'])
    .describe('The self-reported fitness level of the user.'),
});
export type GenerateMetabolicAgeInput = z.infer<
  typeof GenerateMetabolicAgeInputSchema
>;

const GenerateMetabolicAgeOutputSchema = z.object({
  metabolicAge: z
    .number()
    .describe(
      "The calculated metabolic age. This should be a realistic integer based on the provided data."
    ),
  explanation: z
    .string()
    .describe(
      "A brief, one or two-sentence explanation of the result, comparing it to the actual age and highlighting the key contributing factors in a positive and encouraging tone."
    ),
});
export type GenerateMetabolicAgeOutput = z.infer<
  typeof GenerateMetabolicAgeOutputSchema
>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateMetabolicAgeInputSchema.parse(body);

    const prompt = `Estimate a user's metabolic age based on their health data. Metabolic age compares Basal Metabolic Rate (BMR) to the average for their age group. A lower metabolic age is better.
User Data:
- Chronological Age: ${input.actualAge}
- BMI: ${input.bmi} (Healthy: 18.5-24.9)
- Glucose: ${input.glucose} mg/dL (Healthy: 70-100)
- Sleep: ${input.sleepHours} hours (Optimal: 7-9)
- Fitness Level: ${input.fitnessLevel}

Instructions:
1. Calculate a metabolic age. High BMI/glucose increases it; good sleep/fitness decreases it. Start with actual age and adjust realistically (e.g., BMI of 30 might add 5-7 years, 'active' fitness might subtract 3-5).
2. Provide a brief, encouraging explanation for the result, focusing on positive actions.
Respond with only a valid JSON object conforming to the GenerateMetabolicAgeOutput schema.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));


    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Metabolic age generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
