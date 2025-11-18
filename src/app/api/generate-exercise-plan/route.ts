
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

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

const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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

    const openrouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI fitness planner that creates personalized exercise schedules. You always respond with only a valid JSON object as requested.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
      }),
    });

    if (!openrouterRes.ok) {
      const error = await openrouterRes.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await openrouterRes.json();
    const responseText = data.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error('No response content from OpenRouter');
    }

    const responseJson = JSON.parse(responseText);
    const validatedResponse = GenerateExercisePlanOutputSchema.parse(responseJson);

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Exercise plan generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

