
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callOpenAIWithFallback } from '@/lib/openai-client';

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



export async function POST(req: NextRequest) {
  // Fallback recipes to ensure we always return something useful
  const fallbackRecipes = {
    recipes: [
      {
        name: "Simple Vegetable Stir-Fry",
        description: "A quick and healthy diabetes-friendly vegetable dish that's packed with nutrients.",
        ingredients: [
          "2 cups mixed vegetables (any available)",
          "1 tablespoon olive oil",
          "2 cloves garlic, minced",
          "1 teaspoon ginger, minced",
          "2 tablespoons soy sauce (low sodium)",
          "Salt and pepper to taste"
        ],
        instructions: [
          "Heat olive oil in a large pan over medium-high heat",
          "Add garlic and ginger, cook for 30 seconds until fragrant",
          "Add vegetables and stir-fry for 5-7 minutes until tender-crisp",
          "Add soy sauce and seasonings, stir for 1 minute",
          "Serve hot as a side dish or over brown rice"
        ],
        prepTime: "15 minutes",
        totalCalories: 150
      }
    ]
  };

  try {
    const body = await req.json();
    const input = FindRecipesInputSchema.parse(body);
    const { ingredients, dietaryNeeds, translateToHindi } = input;

    const prompt = `You are a creative chef specializing in healthy, diabetes-friendly cooking. Generate 1-3 simple, healthy recipe ideas based on the following:
Ingredients: ${ingredients}
Dietary Needs: ${dietaryNeeds || 'None'}

You must respond with ONLY a valid JSON object in this exact format:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "Short description",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": ["step 1", "step 2"],
      "prepTime": "15 minutes",
      "totalCalories": 250
    }
  ]
}

For each recipe, provide a name, description, ingredients list (feel free to add pantry staples), step-by-step instructions, prep time, and total calorie estimate as a NUMBER.
${translateToHindi ? `IMPORTANT: Provide all fields fully translated into Hindi (Devanagari script).` : ''}`;

    // Use the multi-key OpenAI client through OpenRouter
    const response = await callOpenAIWithFallback(
      "gpt-3.5-turbo",
      [
        { role: 'system', content: 'You must respond with only valid JSON in the exact format requested. Ensure totalCalories is a number, not a string.' },
        { role: 'user', content: prompt },
      ]
    );

    if (!response || !response.content) {
      console.warn("No response content from OpenAI, using fallback recipes");
      return NextResponse.json(fallbackRecipes);
    }

    let responseJson;
    try {
      responseJson = JSON.parse(response.content);
    } catch (parseError) {
      console.warn("Failed to parse OpenAI response, using fallback recipes:", parseError);
      return NextResponse.json(fallbackRecipes);
    }

    // Transform string numbers to actual numbers if needed
    if (responseJson.recipes) {
      responseJson.recipes = responseJson.recipes.map((recipe: any) => ({
        ...recipe,
        totalCalories: typeof recipe.totalCalories === 'string' ? 
          parseInt(recipe.totalCalories) || 200 : 
          recipe.totalCalories
      }));
    }

    // Use safe validation
    const validationResult = FindRecipesOutputSchema.safeParse(responseJson);
    if (!validationResult.success) {
      console.warn("Recipe validation failed, using fallback recipes:", validationResult.error);
      return NextResponse.json(fallbackRecipes);
    }

    return NextResponse.json(validationResult.data);
  } catch (e: any) {
    console.error("Recipe finder failed, using fallback recipes:", e);
    return NextResponse.json(fallbackRecipes);
  }
}

