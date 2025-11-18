
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
  // Fallback exercise plan to ensure we always return something useful
  const fallbackPlan = {
    weeklySummary: "This balanced 7-day plan combines gentle cardio, strength training, and rest days to help manage diabetes risk and improve overall fitness. Start slowly and listen to your body!",
    dailyPlans: [
      {
        day: "Monday",
        focus: "Cardio",
        activity: "Brisk 20-minute walk or light jogging",
        duration: "20-30 minutes"
      },
      {
        day: "Tuesday", 
        focus: "Strength Training",
        activity: "Bodyweight exercises (squats, push-ups, planks)",
        duration: "25 minutes"
      },
      {
        day: "Wednesday",
        focus: "Active Recovery",
        activity: "Gentle stretching or yoga",
        duration: "15-20 minutes"
      },
      {
        day: "Thursday",
        focus: "Cardio",
        activity: "Walking or swimming",
        duration: "25-30 minutes"
      },
      {
        day: "Friday",
        focus: "Strength Training", 
        activity: "Light resistance training or bodyweight exercises",
        duration: "25 minutes"
      },
      {
        day: "Saturday",
        focus: "Flexibility & Rest",
        activity: "Gentle stretching and relaxation",
        duration: "15 minutes"
      },
      {
        day: "Sunday",
        focus: "Rest Day",
        activity: "Complete rest or very light walking",
        duration: "Optional"
      }
    ]
  };

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
      console.warn("OpenRouter API error, using fallback exercise plan");
      return NextResponse.json(fallbackPlan);
    }

    const data = await openrouterRes.json();
    const responseText = data.choices?.[0]?.message?.content;

    if (!responseText) {
      console.warn("No response content from OpenRouter, using fallback");
      return NextResponse.json(fallbackPlan);
    }

    const responseJson = JSON.parse(responseText);
    
    // Use safe validation
    const validationResult = GenerateExercisePlanOutputSchema.safeParse(responseJson);
    if (!validationResult.success) {
      console.warn("Exercise plan validation failed, using fallback:", validationResult.error);
      return NextResponse.json(fallbackPlan);
    }

    return NextResponse.json(validationResult.data);
  } catch (e: any) {
    console.error("Exercise plan generation failed, using fallback:", e);
    return NextResponse.json(fallbackPlan);
  }
}

