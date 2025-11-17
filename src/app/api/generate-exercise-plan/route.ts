
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

const GenerateExercisePlanInputSchema = z.object({
  age: z.number().describe('The age of the user.'),
  bmi: z.number().describe('The BMI (Body Mass Index) of the user.'),
  fitnessLevel: z
    .enum(['sedentary', 'light', 'moderate', 'active'])
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
  model: 'gemini-2.5-flash'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateExercisePlanInputSchema.parse(body);

    const prompt = `Create a 7-day balanced exercise plan for a user with Age: ${input.age}, BMI: ${input.bmi}, Fitness Level: ${input.fitnessLevel}.
The plan should be suitable for managing diabetes risk, including cardio, strength, and rest days.
- 'sedentary'/'light': Low-impact activities (walking, stretching).
- 'moderate': Moderate-intensity (jogging, light weights).
- 'active': Higher-intensity workouts.
Create a plan for 5 active days and 2 rest/recovery days.
Respond with only a valid JSON object conforming to the GenerateExercisePlanOutput schema, including a 'weeklySummary' and 'dailyPlans'.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));


    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Exercise plan generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
