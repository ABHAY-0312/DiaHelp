
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callOpenAIWithFallback } from '@/lib/openai-client';

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

export async function POST(req: NextRequest) {
  // Create fitness-level specific fallback plans
  const createFallbackPlan = (fitnessLevel: string, age: number, bmi: number) => {
    const plans = {
      sedentary: {
        weeklySummary: "This gentle 7-day plan focuses on low-impact activities to help you start your fitness journey safely. Perfect for managing diabetes risk while building healthy habits!",
        dailyPlans: [
          { day: "Monday", focus: "Light Movement", activity: "10-minute gentle walk", duration: "10-15 minutes" },
          { day: "Tuesday", focus: "Stretching", activity: "Chair exercises and gentle stretching", duration: "10-15 minutes" },
          { day: "Wednesday", focus: "Walking", activity: "Slow-paced walk", duration: "15-20 minutes" },
          { day: "Thursday", focus: "Flexibility", activity: "Gentle yoga or stretching routine", duration: "15 minutes" },
          { day: "Friday", focus: "Light Activity", activity: "Easy walk or housework", duration: "10-20 minutes" },
          { day: "Saturday", focus: "Rest & Stretch", activity: "Light stretching or relaxation", duration: "10 minutes" },
          { day: "Sunday", focus: "Rest Day", activity: "Complete rest or very light movement", duration: "Optional" }
        ]
      },
      light: {
        weeklySummary: "This progressive 7-day plan builds on basic activities with slightly more challenge. Great for improving fitness while managing diabetes risk!",
        dailyPlans: [
          { day: "Monday", focus: "Light Cardio", activity: "15-minute brisk walk", duration: "15-20 minutes" },
          { day: "Tuesday", focus: "Strength", activity: "Light bodyweight exercises (wall push-ups, assisted squats)", duration: "15-20 minutes" },
          { day: "Wednesday", focus: "Walking", activity: "Nature walk or treadmill", duration: "20-25 minutes" },
          { day: "Thursday", focus: "Flexibility", activity: "Yoga or tai chi", duration: "20 minutes" },
          { day: "Friday", focus: "Light Training", activity: "Resistance bands or light weights", duration: "15-20 minutes" },
          { day: "Saturday", focus: "Active Recovery", activity: "Gentle swimming or stretching", duration: "15-20 minutes" },
          { day: "Sunday", focus: "Rest Day", activity: "Light stretching or meditation", duration: "10-15 minutes" }
        ]
      },
      moderate: {
        weeklySummary: "This balanced 7-day plan combines cardio, strength training, and recovery to help manage diabetes risk and improve overall fitness. Listen to your body!",
        dailyPlans: [
          { day: "Monday", focus: "Cardio", activity: "Brisk 25-minute walk or light jogging", duration: "25-30 minutes" },
          { day: "Tuesday", focus: "Strength Training", activity: "Bodyweight exercises (squats, push-ups, planks)", duration: "25-30 minutes" },
          { day: "Wednesday", focus: "Active Recovery", activity: "Swimming or yoga", duration: "20-25 minutes" },
          { day: "Thursday", focus: "Cardio", activity: "Cycling or walking", duration: "30 minutes" },
          { day: "Friday", focus: "Strength Training", activity: "Resistance training with weights/bands", duration: "25-30 minutes" },
          { day: "Saturday", focus: "Flexibility", activity: "Yoga or stretching routine", duration: "20 minutes" },
          { day: "Sunday", focus: "Rest Day", activity: "Light walk or complete rest", duration: "Optional" }
        ]
      },
      active: {
        weeklySummary: "This intensive 7-day plan challenges your fitness with higher-intensity workouts. Excellent for managing diabetes risk and achieving peak health!",
        dailyPlans: [
          { day: "Monday", focus: "High-Intensity Cardio", activity: "30-minute run or intense cycling", duration: "30-40 minutes" },
          { day: "Tuesday", focus: "Strength Training", activity: "Weight training (compound exercises)", duration: "35-45 minutes" },
          { day: "Wednesday", focus: "HIIT", activity: "High-intensity interval training", duration: "25-30 minutes" },
          { day: "Thursday", focus: "Cardio", activity: "Running, cycling, or sport", duration: "35-45 minutes" },
          { day: "Friday", focus: "Strength Training", activity: "Advanced resistance training", duration: "35-45 minutes" },
          { day: "Saturday", focus: "Active Recovery", activity: "Long hike or intensive yoga", duration: "30-45 minutes" },
          { day: "Sunday", focus: "Recovery", activity: "Gentle yoga or stretching", duration: "20-30 minutes" }
        ]
      }
    };
    
    // Adjust duration for older adults
    if (age > 65) {
      const plan = JSON.parse(JSON.stringify(plans[fitnessLevel as keyof typeof plans]));
      plan.dailyPlans.forEach((day: any) => {
        if (day.duration.includes('-')) {
          const times = day.duration.split('-');
          const lower = parseInt(times[0]);
          const upper = parseInt(times[1]);
          day.duration = `${Math.max(10, lower - 5)}-${upper - 5} minutes`;
        }
      });
      return plan;
    }
    
    return plans[fitnessLevel as keyof typeof plans] || plans.moderate;
  };

  try {
    const body = await req.json();
    const input = GenerateExercisePlanInputSchema.parse(body);
    
    // Get the appropriate fallback plan for this fitness level
    const fallbackPlan = createFallbackPlan(input.fitnessLevel, input.age, input.bmi);

    // Create detailed, fitness-level specific prompt
    const getFitnessGuidelines = (level: string) => {
      switch(level) {
        case 'sedentary':
          return `SEDENTARY level (just starting): Focus on very gentle activities:
          - Walking: 10-20 minutes maximum, slow pace
          - Stretching: Chair exercises, gentle yoga
          - Duration: 10-20 minutes max per session
          - Activities: Walking, stretching, chair exercises, gentle housework`;
        case 'light':
          return `LIGHT level (some activity): Focus on low-impact exercises:
          - Walking: 15-25 minutes at comfortable pace
          - Light strength: Bodyweight exercises, resistance bands
          - Duration: 15-25 minutes per session
          - Activities: Brisk walking, light yoga, swimming, gardening`;
        case 'moderate':
          return `MODERATE level (regularly active): Balanced cardio and strength:
          - Cardio: 25-35 minutes jogging, cycling, swimming
          - Strength: Full bodyweight or light weights
          - Duration: 25-35 minutes per session
          - Activities: Jogging, weight training, sports, hiking`;
        case 'active':
          return `ACTIVE level (very fit): High-intensity training:
          - Cardio: 30-45 minutes running, intense cycling, sports
          - Strength: Advanced weights, compound exercises
          - Duration: 30-45 minutes per session
          - Activities: Running, HIIT, heavy weights, competitive sports`;
        default:
          return 'Moderate intensity exercises appropriate for general fitness.';
      }
    };

    const prompt = `Create a personalized 7-day exercise plan for:
- Age: ${input.age} years old
- BMI: ${input.bmi}
- Fitness Level: ${input.fitnessLevel.toUpperCase()}

${getFitnessGuidelines(input.fitnessLevel)}

IMPORTANT: Adjust intensity and duration based on the fitness level above.
For older adults (65+): Reduce duration by 5 minutes.
For higher BMI (>30): Focus on low-impact activities.

Respond with ONLY valid JSON in this exact format:
{
  "weeklySummary": "Encouraging summary mentioning the fitness level and benefits",
  "dailyPlans": [
    {
      "day": "Monday",
      "focus": "Main focus area",
      "activity": "Specific activity matched to fitness level",
      "duration": "Time range appropriate for fitness level"
    }
    // ... continue for all 7 days
  ]
}

Create exactly 7 days (Monday-Sunday) with activities appropriate for ${input.fitnessLevel} fitness level.
Include 1-2 rest/recovery days suitable for diabetes management.`;

    try {
      const response = await callOpenAIWithFallback(
        "gpt-3.5-turbo",
        [
          { role: 'system', content: 'You must respond with only valid JSON in the exact format requested. Ensure all fields are strings as specified.' },
          { role: 'user', content: prompt },
        ]
      );

      console.log("OpenAI exercise plan response:", response);

      // Fix: Access the correct response format
      const responseContent = response?.choices?.[0]?.message?.content;
      
      if (!responseContent || responseContent.trim().length === 0) {
        console.warn(`No response content from OpenAI, using ${input.fitnessLevel} fallback`);
        return NextResponse.json(fallbackPlan);
      }

      let responseJson;
      try {
        // Clean up the response text
        let cleanedText = responseContent.trim();
        cleanedText = cleanedText.replace(/```json\n?/g, "");
        cleanedText = cleanedText.replace(/```\n?/g, "");
        
        responseJson = JSON.parse(cleanedText);
        console.log("Parsed exercise plan JSON:", responseJson);
      } catch (parseError) {
        console.warn(`Failed to parse exercise plan response, using ${input.fitnessLevel} fallback:`, parseError);
        return NextResponse.json(fallbackPlan);
      }
      
      // Use safe validation
      const validationResult = GenerateExercisePlanOutputSchema.safeParse(responseJson);
      if (!validationResult.success) {
        console.warn(`Exercise plan validation failed, using ${input.fitnessLevel} fallback:`, validationResult.error);
        return NextResponse.json(fallbackPlan);
      }

      return NextResponse.json(validationResult.data);
    } catch (e: any) {
      console.error(`Exercise plan generation failed, using ${input.fitnessLevel} fallback:`, e);
      return NextResponse.json(fallbackPlan);
    }
  } catch (e: any) {
    console.error("Exercise plan API failed, using moderate fallback:", e);
    // If we can't parse input, default to moderate plan
    return NextResponse.json(createFallbackPlan('moderate', 40, 25));
  }
}

