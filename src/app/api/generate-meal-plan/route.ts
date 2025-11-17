
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

const GenerateMealPlanInputSchema = z.object({
  riskScore: z.number().describe('The diabetes risk score (0-100).'),
  keyFactors: z
    .array(z.string())
    .describe(
      'The key health factors contributing to the risk (e.g., "High BMI", "Elevated Glucose").'
    ),
  preferences: z
    .string()
    .describe(
      'User-specified dietary preferences or restrictions (e.g., "vegetarian", "no nuts").'
    )
    .optional(),
});
export type GenerateMealPlanInput = z.infer<typeof GenerateMealPlanInputSchema>;

const MealSchema = z.object({
  name: z.string().describe('The name of the meal (e.g., "Scrambled Eggs with Spinach").'),
  description: z
    .string()
    .describe('A brief, appealing description of the meal and why it is healthy.'),
});

const GenerateMealPlanOutputSchema = z.object({
  breakfast: MealSchema,
  lunch: MealSchema,
  dinner: MealSchema,
  snack: MealSchema.describe('A healthy snack option.'),
  summary: z.string().describe('A brief summary explaining the overall approach for the meal plan.'),
});
export type GenerateMealPlanOutput = z.infer<typeof GenerateMealPlanOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateMealPlanInputSchema.parse(body);

    const prompt = `Create a simple, balanced, 1-day meal plan (breakfast, lunch, dinner, snack) for a user managing diabetes risk.
User Profile:
- Risk Score: ${input.riskScore}/100
- Key Factors: ${input.keyFactors.join(', ')}
${input.preferences ? `- Preferences: ${input.preferences}` : ''}
The plan should focus on whole foods, be low in processed sugars, and easy to prepare.
Respond with only a valid JSON object conforming to the GenerateMealPlanOutput schema, including a 'summary' of the plan's goals.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));


    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Meal plan generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

