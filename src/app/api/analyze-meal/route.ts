import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callGeminiWithFallback } from '@/lib/gemini-client';

const AnalyzeMealInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a meal, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type AnalyzeMealInput = z.infer<typeof AnalyzeMealInputSchema>;

const FoodItemSchema = z.object({
    name: z.string().describe("The identified name of the food item. Be specific (e.g., 'Sliced Apple' not just 'Apple')."),
    quantity: z.number().describe("The quantity of the food item. If multiple identical items are present, group them here."),
    calories: z.number().describe("Estimated calories for this single item."),
    carbohydrates: z.number().describe("Estimated carbohydrates in grams for this single item."),
});

const RecoveryPlanSchema = z.object({
    walkReminder: z.string().describe("A short reminder to take a 20-minute walk."),
    waterPrompt: z.string().describe("A prompt to drink 300ml of water."),
    dinnerSuggestion: z.string().describe("A simple, healthy, low-glycemic index dinner suggestion."),
});

const AnalyzeMealOutputSchema = z.object({
  isFood: z.boolean().describe("Whether the image appears to contain food."),
  items: z.array(FoodItemSchema).describe("A list of food items identified in the meal. If multiple identical items are detected, group them and set the quantity."),
  totalCalories: z.number().describe("The estimated total calories for the entire meal."),
  totalCarbohydrates: z.number().describe("The estimated total carbohydrates in grams for the entire meal."),
  feedback: z.string().describe("A brief, helpful feedback message about the meal's nutritional content, especially in the context of diabetes management."),
  recoveryPlan: RecoveryPlanSchema.optional().describe("A recovery plan that is only populated if the meal is identified as a 'cheat meal' (e.g., high in sugar, unhealthy fats, or processed carbs). Otherwise, this should be omitted.")
});
export type AnalyzeMealOutput = z.infer<typeof AnalyzeMealOutputSchema>;

export async function POST(req: NextRequest) {
  // Fallback meal analysis to ensure we always return something useful
  const generateFallbackAnalysis = () => {
    return {
      isFood: true,
      items: [
        {
          name: "Mixed Meal",
          quantity: 1,
          calories: 400,
          carbohydrates: 45
        }
      ],
      totalCalories: 400,
      totalCarbohydrates: 45,
      feedback: "We're unable to analyze your meal image right now due to high server demand. This is a general estimate for a typical mixed meal. For accurate tracking, consider logging individual food items manually.",
    };
  };

  try {
    const body = await req.json();
    const { photoDataUri } = AnalyzeMealInputSchema.parse(body);

    const mimeTypeMatch = photoDataUri.match(/^data:(image\/\w+);base64,/);
    if (!mimeTypeMatch) {
      return NextResponse.json({ error: 'Invalid data URI format.' }, { status: 400 });
    }
    
    const imagePart = {
      inlineData: {
        data: photoDataUri.split(',')[1],
        mimeType: mimeTypeMatch[1],
      },
    };

    const prompt = `Analyze the meal in the photo and respond with only a valid JSON object in this exact format:
{
  "isFood": true,
  "items": [
    {
      "name": "Food Item Name",
      "quantity": 1,
      "calories": 150,
      "carbohydrates": 20
    }
  ],
  "totalCalories": 150,
  "totalCarbohydrates": 20,
  "feedback": "Brief feedback about the meal for diabetes management",
  "recoveryPlan": {
    "walkReminder": "Take a 20-minute walk after eating",
    "waterPrompt": "Drink 300ml of water",
    "dinnerSuggestion": "Light dinner suggestion"
  }
}

Instructions:
1. Identify each food item with realistic calorie and carb estimates
2. Calculate accurate totals by summing individual items
3. Provide helpful diabetes-friendly feedback
4. Only include recoveryPlan if it's a high-sugar/high-carb cheat meal
5. If not food, set isFood to false and omit other fields

Be specific with food names and provide numerical estimates even if uncertain.`;

    // Add timeout for Gemini API
    try {
      const result = await callGeminiWithFallback([prompt, imagePart], 'gemini-2.5-pro', 15000);
      const responseText = result.response.text();
      
      if (!responseText || responseText.trim().length === 0) {
        console.warn("Empty response from Gemini, using fallback analysis");
        return NextResponse.json(generateFallbackAnalysis());
      }

      // Clean up the response text
      let cleanedText = responseText.trim();
      cleanedText = cleanedText.replace(/```json\n?/g, "");
      cleanedText = cleanedText.replace(/```\n?/g, "");
      
      let responseJson;
      try {
        responseJson = JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn("Failed to parse Gemini response, using fallback analysis:", parseError);
        return NextResponse.json(generateFallbackAnalysis());
      }

      // Use safe validation
      const validationResult = AnalyzeMealOutputSchema.safeParse(responseJson);
      if (!validationResult.success) {
        console.warn("Meal analysis validation failed, using fallback analysis:", validationResult.error);
        return NextResponse.json(generateFallbackAnalysis());
      }

      return NextResponse.json(validationResult.data);
    } catch (geminiError: any) {
      console.warn("Gemini API failed, using fallback analysis:", geminiError.message);
      return NextResponse.json(generateFallbackAnalysis());
    }

  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Meal analysis failed completely:", e);
    return NextResponse.json(generateFallbackAnalysis());
  }
}

