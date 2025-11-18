
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

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

const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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

    const openrouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a creative chef specializing in healthy, diabetes-friendly cooking. You always respond with only a valid JSON object as requested.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
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
    const validatedResponse = FindRecipesOutputSchema.parse(responseJson);

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Recipe finder failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

