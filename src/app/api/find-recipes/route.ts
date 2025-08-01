
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
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
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        recipes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              ingredients: { type: 'array', items: { type: 'string' } },
              instructions: { type: 'array', items: { type: 'string' } },
              prepTime: { type: 'string' },
              totalCalories: { type: 'number' },
            },
            required: ['name', 'description', 'ingredients', 'instructions', 'prepTime', 'totalCalories'],
          },
        },
      },
      required: ['recipes'],
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingredients, dietaryNeeds, translateToHindi } = FindRecipesInputSchema.parse(body);

    const prompt = `You are a creative chef who specializes in healthy, diabetes-friendly cooking.

A user has the following ingredients: ${ingredients}.
${dietaryNeeds ? `They also have the following dietary need: ${dietaryNeeds}.` : ''}

Based on these ingredients, generate 1 to 3 simple and healthy recipe ideas. The recipes should be suitable for someone managing their blood sugar.

For each recipe, provide:
- A creative name.
- A brief, appealing description.
- A full list of ingredients (you can add common pantry staples like oil, salt, pepper).
- Simple, step-by-step instructions.
- An estimated prep time.
- An estimated total calorie count for the entire dish.

${translateToHindi ? `IMPORTANT: The user has requested the output in Hindi. Please provide all fields (name, description, ingredients, instructions, prepTime, totalCalories) fully translated into Hindi, using Devanagari script. The entire response must conform to the required JSON schema.` : ''}
`;

    const result = await model.generateContent(prompt);
    const responseJson = JSON.parse(result.response.text());

    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Recipe finder failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
