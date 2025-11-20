
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
  recipes: z.array(RecipeSchema).min(2).describe("A list of at least 2 healthy recipes that can be made with the provided ingredients."),
});
export type FindRecipesOutput = z.infer<typeof FindRecipesOutputSchema>;



export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = FindRecipesInputSchema.parse(body);
    const { ingredients, dietaryNeeds, translateToHindi } = input;

    // Fallback recipes to ensure we always return something useful
    const fallbackRecipes = {
      recipes: [
        {
          name: translateToHindi ? "सरल सब्जी स्टिर-फ्राई" : "Simple Vegetable Stir-Fry",
          description: translateToHindi ? 
            "एक त्वरित और स्वस्थ डायबिटीज़ अनुकूल सब्जी व्यंजन जो पोषक तत्वों से भरपूर है।" :
            "A quick and healthy diabetes-friendly vegetable dish that's packed with nutrients.",
          ingredients: translateToHindi ? [
            "2 कप मिश्रित सब्जियाँ (कोई भी उपलब्ध)",
            "1 चम्मच जैतून का तेल",
            "2 लहसुन की कलियाँ, बारीक कटी हुई",
            "1 चम्मच अदरक, बारीक कटा हुआ",
            "2 चम्मच सोया सॉस (कम नमक)",
            "स्वादानुसार नमक और काली मिर्च"
          ] : [
            "2 cups mixed vegetables (any available)",
            "1 tablespoon olive oil",
            "2 cloves garlic, minced",
            "1 teaspoon ginger, minced",
            "2 tablespoons soy sauce (low sodium)",
            "Salt and pepper to taste"
          ],
          instructions: translateToHindi ? [
            "एक बड़े पैन में जैतून का तेल मध्यम-तेज आंच पर गर्म करें",
            "लहसुन और अदरक डालें, 30 सेकंड तक खुशबू आने तक पकाएं",
            "सब्जियां डालें और 5-7 मिनट तक नरम होने तक हिलाते रहें",
            "सोया सॉस और मसाले डालें, 1 मिनट तक हिलाएं",
            "गर्म परोसें या ब्राउन राइस के साथ खाएं"
          ] : [
            "Heat olive oil in a large pan over medium-high heat",
            "Add garlic and ginger, cook for 30 seconds until fragrant",
            "Add vegetables and stir-fry for 5-7 minutes until tender-crisp",
            "Add soy sauce and seasonings, stir for 1 minute",
            "Serve hot as a side dish or over brown rice"
          ],
          prepTime: translateToHindi ? "15 मिनट" : "15 minutes",
          totalCalories: 150
        },
        {
          name: translateToHindi ? "स्वस्थ मिश्रित सलाद" : "Healthy Mixed Salad",
          description: translateToHindi ?
            "एक पौष्टिक और भरपूर सलाद जो डायबिटीज़ आहार के लिए उपयुक्त है।" :
            "A nutritious and filling salad perfect for diabetic diet.",
          ingredients: translateToHindi ? [
            "2 कप मिश्रित हरी पत्तियाँ",
            "1 खीरा, कटा हुआ",
            "1 टमाटर, कटा हुआ",
            "1 चम्मच जैतून का तेल",
            "1 चम्मच नींबू का रस",
            "स्वादानुसार नमक और काली मिर्च"
          ] : [
            "2 cups mixed greens",
            "1 cucumber, diced",
            "1 tomato, chopped",
            "1 tablespoon olive oil",
            "1 tablespoon lemon juice",
            "Salt and pepper to taste"
          ],
          instructions: translateToHindi ? [
            "सभी सब्जियों को धोकर तैयार करें",
            "एक बड़े कटोरे में हरी पत्तियाँ, खीरा और टमाटर मिलाएं",
            "जैतून का तेल और नींबू का रस एक साथ मिलाएं",
            "ड्रेसिंग को सलाद पर डालें और अच्छी तरह मिलाएं",
            "नमक और काली मिर्च डालें, तुरंत परोसें"
          ] : [
            "Wash and prepare all vegetables",
            "Mix greens, cucumber, and tomato in a large bowl",
            "Whisk together olive oil and lemon juice",
            "Pour dressing over salad and toss well",
            "Season with salt and pepper, serve immediately"
          ],
          prepTime: translateToHindi ? "10 मिनट" : "10 minutes",
          totalCalories: 120
        }
      ]
    };

    const prompt = `You are a creative chef specializing in healthy, diabetes-friendly cooking. Generate EXACTLY 2-3 simple, healthy recipe ideas based on the following:
Ingredients: ${ingredients}
Dietary Needs: ${dietaryNeeds || 'None'}

${translateToHindi ? 
  `CRITICAL: You MUST provide ALL text in Hindi (Devanagari script). Recipe names, descriptions, ingredients, and instructions should ALL be in Hindi. Do not mix English and Hindi.` : 
  `Provide all text in English.`
}

You must respond with ONLY a valid JSON object in this exact format:
{
  "recipes": [
    {
      "name": "${translateToHindi ? 'व्यंजन का नाम' : 'Recipe Name'}",
      "description": "${translateToHindi ? 'छोटा विवरण' : 'Short description'}",
      "ingredients": ["${translateToHindi ? 'सामग्री 1' : 'ingredient 1'}", "${translateToHindi ? 'सामग्री 2' : 'ingredient 2'}"],
      "instructions": ["${translateToHindi ? 'चरण 1' : 'step 1'}", "${translateToHindi ? 'चरण 2' : 'step 2'}"],
      "prepTime": "${translateToHindi ? '15 मिनट' : '15 minutes'}",
      "totalCalories": 250
    },
    {
      "name": "${translateToHindi ? 'दूसरे व्यंजन का नाम' : 'Second Recipe Name'}",
      "description": "${translateToHindi ? 'दूसरा छोटा विवरण' : 'Second short description'}",
      "ingredients": ["${translateToHindi ? 'सामग्री 1' : 'ingredient 1'}", "${translateToHindi ? 'सामग्री 2' : 'ingredient 2'}"],
      "instructions": ["${translateToHindi ? 'चरण 1' : 'step 1'}", "${translateToHindi ? 'चरण 2' : 'step 2'}"],
      "prepTime": "${translateToHindi ? '20 मिनट' : '20 minutes'}",
      "totalCalories": 300
    }
  ]
}

MANDATORY REQUIREMENTS:
- Provide EXACTLY 2-3 recipes (minimum 2)
- Each recipe must include ALL required fields
- totalCalories must be a NUMBER, not a string
- ${translateToHindi ? 'ALL TEXT must be in Hindi (Devanagari script)' : 'All text must be in English'}
- Focus on diabetes-friendly, low-GI ingredients
- Keep recipes simple and practical`;

    // Use the multi-key OpenAI client through OpenRouter
    const response = await callOpenAIWithFallback(
      "gpt-3.5-turbo",
      [
        { 
          role: 'system', 
          content: `You must respond with only valid JSON in the exact format requested. Ensure totalCalories is a number, not a string. ${translateToHindi ? 'CRITICAL: ALL text fields must be in Hindi (Devanagari script) when translation is requested.' : 'Provide all text in English.'}` 
        },
        { role: 'user', content: prompt },
      ]
    );

    if (!response || !response.choices || !response.choices[0] || !response.choices[0].message || !response.choices[0].message.content) {
      console.warn("No response content from OpenAI, using fallback recipes");
      return NextResponse.json(fallbackRecipes);
    }

    const responseContent = response.choices[0].message.content;
    console.log("OpenAI Response Content:", responseContent?.substring(0, 200) + "...");

    let responseJson;
    try {
      responseJson = JSON.parse(responseContent);
    } catch (parseError) {
      console.warn("Failed to parse OpenAI response, using fallback recipes:", parseError);
      console.log("Raw OpenAI response:", responseContent);
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

