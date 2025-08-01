
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
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
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        breakfast: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['name', 'description'],
        },
        lunch: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['name', 'description'],
        },
        dinner: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['name', 'description'],
        },
        snack: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['name', 'description'],
        },
        summary: { type: 'string' },
      },
      required: ['breakfast', 'lunch', 'dinner', 'snack', 'summary'],
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateMealPlanInputSchema.parse(body);

    const prompt = `You are a certified nutritionist specializing in creating meal plans for individuals managing diabetes risk.

Create a simple, balanced, and delicious 1-day meal plan (breakfast, lunch, dinner, and one snack) for a user with the following profile:
- Diabetes Risk Score: ${input.riskScore}/100
- Key Health Factors: ${input.keyFactors.join(', ')}
${input.preferences ? `- Dietary Preferences: ${input.preferences}` : ''}

Your plan should focus on whole foods, be low in processed sugars and refined carbohydrates, and be balanced with lean protein, healthy fats, and fiber.

For each meal, provide a name and a short, encouraging description. Also, provide a brief summary of the meal plan's health goals.

Prioritize meals that are easy to prepare.
`;

    const result = await model.generateContent(prompt);
    const responseJson = JSON.parse(result.response.text());

    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Meal plan generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
