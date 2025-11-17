
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

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

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-pro',
});

export async function POST(req: NextRequest) {
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

    const prompt = `Analyze the meal in the photo and respond with only a valid JSON object conforming to the AnalyzeMealOutput schema.
Instructions:
1.  **Identify Food Items**: Identify each item, its calories, and carbs. Group identical items and set 'quantity'.
2.  **Provide Feedback**: Give brief, constructive feedback relevant to diabetes risk management.
3.  **Check for Cheat Meal**: Determine if the meal is a "cheat meal" (high sugar/fat/processed carbs).
4.  **Generate Recovery Plan**: If it's a cheat meal, create a 'recoveryPlan' with a 'walkReminder', 'waterPrompt', and a healthy 'dinnerSuggestion'. Omit this field otherwise.
If the image is not food, set 'isFood' to false and leave other fields empty.`;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));


    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Meal analysis failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
