
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
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
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        isFood: { type: 'boolean' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              calories: { type: 'number' },
              carbohydrates: { type: 'number' },
            },
            required: ['name', 'quantity', 'calories', 'carbohydrates'],
          },
        },
        totalCalories: { type: 'number' },
        totalCarbohydrates: { type: 'number' },
        feedback: { type: 'string' },
        recoveryPlan: {
          type: 'object',
          properties: {
            walkReminder: { type: 'string' },
            waterPrompt: { type: 'string' },
            dinnerSuggestion: { type: 'string' },
          },
          required: ['walkReminder', 'waterPrompt', 'dinnerSuggestion'],
        },
      },
      required: ['isFood', 'items', 'totalCalories', 'totalCarbohydrates', 'feedback'],
    },
  },
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

    const prompt = `You are a helpful nutrition assistant for DiaHelper. Analyze the meal in the provided photo.

1.  **Identify Food Items**: Identify each food item, and estimate its calories and carbohydrate content PER ITEM. Be specific (e.g., 'Sliced Apple'). If you see multiple identical items, group them and set the 'quantity' field. Calculate totals for the entire meal.
2.  **Provide Feedback**: Based on the analysis, provide a short, constructive feedback message considering general advice for a balanced diet relevant to diabetes risk management.
3.  **Check for Cheat Meal**: Determine if the meal qualifies as a "cheat meal" (e.g., pizza, sweets, burgers, very high in processed carbs or sugar).
4.  **Generate Recovery Plan (if applicable)**: If it is a cheat meal, generate a "Cheat Meal Recovery Plan" with the following three components:
    *   A brief, encouraging reminder for a 20-minute walk (e.g., "A brisk 20-minute walk can help manage blood sugar levels.").
    *   A simple prompt to drink water (e.g., "Don't forget to drink a large glass of water (about 300ml) to stay hydrated.").
    *   A specific, simple, and healthy low-glycemic index (low-GI) dinner suggestion (e.g., "For dinner, consider grilled chicken breast with a side of steamed broccoli and quinoa.").
    *   Populate the 'recoveryPlan' field with this information. If it's not a cheat meal, do not include the 'recoveryPlan' field.

If the image does not appear to contain food, set the 'isFood' flag to false and do not populate the other fields.`;

    const result = await model.generateContent([prompt, imagePart]);
    const responseJson = JSON.parse(result.response.text());

    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Meal analysis failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
