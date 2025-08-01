
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

const GenerateExercisePlanInputSchema = z.object({
  age: z.number().describe('The age of the user.'),
  bmi: z.number().describe('The BMI (Body Mass Index) of the user.'),
  fitnessLevel: z
    .enum(['beginner', 'intermediate', 'advanced'])
    .describe('The self-reported fitness level of the user.'),
});
export type GenerateExercisePlanInput = z.infer<
  typeof GenerateExercisePlanInputSchema
>;

const DailyPlanSchema = z.object({
  day: z.string().describe('The day of the week (e.g., "Monday").'),
  focus: z
    .string()
    .describe(
      'The main focus for the day (e.g., "Cardio", "Strength Training", "Flexibility & Rest").'
    ),
  activity: z
    .string()
    .describe('A specific activity or exercise for the day.'),
  duration: z.string().describe("The duration of the activity (e.g., '30 minutes')."),
});

const GenerateExercisePlanOutputSchema = z.object({
  weeklySummary: z
    .string()
    .describe(
      'A brief, encouraging summary of the weekly plan and its benefits.'
    ),
  dailyPlans: z
    .array(DailyPlanSchema)
    .describe(
      'An array of daily exercise plans for 5 days, with 2 rest days.'
    ),
});
export type GenerateExercisePlanOutput = z.infer<
  typeof GenerateExercisePlanOutputSchema
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
        weeklySummary: { type: 'string' },
        dailyPlans: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              day: { type: 'string' },
              focus: { type: 'string' },
              activity: { type: 'string' },
              duration: { type: 'string' },
            },
            required: ['day', 'focus', 'activity', 'duration'],
          },
        },
      },
      required: ['weeklySummary', 'dailyPlans'],
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateExercisePlanInputSchema.parse(body);

    const prompt = `You are an expert fitness coach specializing in creating accessible exercise plans for individuals managing diabetes risk.

Create a 7-day exercise plan for a user with the following profile:
- Age: ${input.age}
- BMI: ${input.bmi}
- Fitness Level: ${input.fitnessLevel}

The plan should be balanced, including a mix of cardiovascular exercise, strength training, and flexibility or rest days.
- For 'beginner', focus on low-impact activities like walking, stretching, and bodyweight exercises.
- For 'intermediate', introduce moderate-intensity activities like jogging, light weightlifting.
- For 'advanced', suggest higher-intensity workouts.

Create a plan for 5 active days and 2 rest/active recovery days.

For each day, provide the day of the week, a focus, a specific activity, and a recommended duration.
Also provide an overall weekly summary that is positive and motivating.
`;

    const result = await model.generateContent(prompt);
    const responseJson = JSON.parse(result.response.text());

    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Exercise plan generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
