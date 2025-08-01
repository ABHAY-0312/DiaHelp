
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

const GenerateMetabolicAgeInputSchema = z.object({
  actualAge: z.number().describe('The chronological age of the user.'),
  bmi: z.number().describe('The BMI (Body Mass Index) of the user.'),
  glucose: z.number().describe('The plasma glucose concentration of the user.'),
  sleepHours: z.number().describe('The average hours of sleep per night for the user.'),
  fitnessLevel: z
    .enum(['beginner', 'intermediate', 'advanced'])
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
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        metabolicAge: { type: 'number' },
        explanation: { type: 'string' },
      },
      required: ['metabolicAge', 'explanation'],
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateMetabolicAgeInputSchema.parse(body);

    const prompt = `You are a health and wellness expert. Your task is to estimate a user's metabolic age based on their health data.

Metabolic age is a comparison of an individual's Basal Metabolic Rate (BMR) against the average BMR of their chronological age group. A lower metabolic age than chronological age indicates good health.

Analyze the following user data:
- Chronological Age: ${input.actualAge}
- BMI: ${input.bmi} (Healthy range is 18.5-24.9)
- Glucose: ${input.glucose} mg/dL (Healthy fasting range is 70-100 mg/dL)
- Average Sleep: ${input.sleepHours} hours (Optimal is 7-9 hours)
- Fitness Level: ${input.fitnessLevel}

Based on these factors, calculate a metabolic age.
- A high BMI and high glucose will significantly increase metabolic age.
- Good sleep (7-9 hours) and a higher fitness level will decrease metabolic age.
- Start with the actual age and adjust it up or down based on how the user's metrics compare to healthy norms. For example, a BMI of 30 might add 5-7 years, while an 'advanced' fitness level might subtract 3-5 years.

After calculating the metabolic age, provide a brief, encouraging explanation for the result. Frame it positively, focusing on what the user can do to improve or maintain their health. For example, if the metabolic age is high, say something like "Your metabolic age is estimated to be X. It's a bit higher than your actual age, mainly due to BMI, but improving this with regular exercise can make a big difference!". If it's low, congratulate them.
`;

    const result = await model.generateContent(prompt);
    const responseJson = JSON.parse(result.response.text());

    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Metabolic age generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
