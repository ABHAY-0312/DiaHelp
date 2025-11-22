
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callOpenAIWithFallback } from '@/lib/openai-client';

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

export async function POST(req: NextRequest) {
  // Fallback meal plan to ensure we always return something useful
  const fallbackMealPlan = {
    breakfast: {
      name: "Greek Yogurt with Berries",
      description: "High-protein Greek yogurt topped with fresh berries and a sprinkle of nuts for fiber and healthy fats."
    },
    lunch: {
      name: "Grilled Chicken Salad", 
      description: "Lean chicken breast over mixed greens with olive oil dressing, providing protein and essential nutrients."
    },
    dinner: {
      name: "Baked Salmon with Vegetables",
      description: "Omega-3 rich salmon with roasted broccoli and sweet potato for balanced nutrition."
    },
    snack: {
      name: "Apple with Almond Butter",
      description: "Natural apple paired with protein-rich almond butter for sustained energy."
    },
    summary: "This balanced meal plan focuses on whole foods, lean proteins, and complex carbohydrates to help manage blood sugar levels effectively."
  };

  try {
    const body = await req.json();
    const input = GenerateMealPlanInputSchema.parse(body);

    const prompt = `Create a simple, balanced, 1-day meal plan (breakfast, lunch, dinner, snack) for a user managing diabetes risk.
User Profile:
- Risk Score: ${input.riskScore}/100
- Key Factors: ${input.keyFactors.join(', ')}
${input.preferences ? `- Preferences: ${input.preferences}` : ''}

The plan should focus on whole foods, be low in processed sugars, and easy to prepare.
You must respond with only a valid JSON object that conforms to this format:
{
  "breakfast": {"name": "meal name", "description": "brief description"},
  "lunch": {"name": "meal name", "description": "brief description"}, 
  "dinner": {"name": "meal name", "description": "brief description"},
  "snack": {"name": "snack name", "description": "brief description"},
  "summary": "brief summary of the plan's goals"
}`;

    try {
      console.log('🍽️ Generating meal plan using OpenAI with multi-key rotation...');
      
      const response = await callOpenAIWithFallback(
        "openai/gpt-3.5-turbo",
        [
          { role: 'system', content: 'You are an AI nutritionist that creates personalized meal plans. You always respond with only a valid JSON object as requested.' },
          { role: 'user', content: prompt },
        ],
        {
          temperature: 0.7,
          response_format: { type: "json_object" },
          timeout: 15000
        }
      );

      console.log("OpenAI meal plan response:", response);

      const responseContent = response?.choices?.[0]?.message?.content;
      
      if (!responseContent || responseContent.trim().length === 0) {
        console.warn("No response content from OpenAI, using fallback meal plan");
        return NextResponse.json(fallbackMealPlan);
      }

      let responseJson;
      try {
        // Clean up the response text
        let cleanedText = responseContent.trim();
        cleanedText = cleanedText.replace(/```json\n?/g, "");
        cleanedText = cleanedText.replace(/```\n?/g, "");
        
        responseJson = JSON.parse(cleanedText);
        console.log("Parsed meal plan JSON:", responseJson);
      } catch (parseError) {
        console.warn("Failed to parse meal plan response, using fallback:", parseError);
        return NextResponse.json(fallbackMealPlan);
      }
      
      // Use safe validation
      const validationResult = GenerateMealPlanOutputSchema.safeParse(responseJson);
      if (!validationResult.success) {
        console.warn("Meal plan validation failed, using fallback:", validationResult.error);
        return NextResponse.json(fallbackMealPlan);
      }

      return NextResponse.json(validationResult.data);
    } catch (e: any) {
      console.error("OpenAI meal plan generation failed, using fallback:", e);
      return NextResponse.json(fallbackMealPlan);
    }
  } catch (e: any) {
    console.error("Meal plan API failed, using fallback:", e);
    return NextResponse.json(fallbackMealPlan);
  }
}

