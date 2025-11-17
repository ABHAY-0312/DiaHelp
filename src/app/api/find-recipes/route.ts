
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

const FindRecipesInputSchema = z.object({
  ingredients: z.string().describe('A comma-separated list of ingredients the user has.'),
  dietaryNeeds: z.string().describe("Any specific dietary needs, e.g., 'low-carb', 'gluten-free'.").optional(),
  translateToHindi: z.boolean().describe("Whether to translate the recipe to Hindi.").optional(),
});
export type FindRecipesInput = z.infer<typeof FindRecipesInputSchema>;

const RecipeSchema = z.object({
    name: z.string().describe("The name of the recipe."),
    description: z.string().describe("A short, enticing description of the dish."),
    ingredients: z.array(z.string()).describe("List of all ingredients required."),
    instructions: z.array(z.string()).describe("Step-by-step cooking instructions."),
    prepTime: z.string().describe("Estimated preparation time (e.g., '15 minutes')."),
    totalCalories: z.number().describe("Estimated total calories for the entire recipe."),
});

const FindRecipesOutputSchema = z.object({
  recipes: z.array(RecipeSchema).describe("A list of 1-3 healthy recipes that can be made with the provided ingredients."),
});
export type FindRecipesOutput = z.infer<typeof FindRecipesOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingredients, dietaryNeeds, translateToHindi } = FindRecipesInputSchema.parse(body);

    const prompt = `You are a creative chef specializing in healthy, diabetes-friendly cooking. Generate 1-3 simple, healthy recipe ideas based on the following:
Ingredients: ${ingredients}
Dietary Needs: ${dietaryNeeds || 'None'}
Respond with only a valid JSON object conforming to the FindRecipesOutput schema.
For each recipe, provide a name, description, ingredients list (feel free to add pantry staples), step-by-step instructions, prep time, and total calorie estimate.
${translateToHindi ? `IMPORTANT: Provide all fields fully translated into Hindi (Devanagari script).` : ''}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));


    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Recipe finder failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

