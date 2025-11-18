
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

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

const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateMealPlanInputSchema.parse(body);

    const prompt = `Create a simple, balanced, 1-day meal plan (breakfast, lunch, dinner, snack) for a user managing diabetes risk.
User Profile:
- Risk Score: ${input.riskScore}/100
- Key Factors: ${input.keyFactors.join(', ')}
${input.preferences ? `- Preferences: ${input.preferences}` : ''}
The plan should focus on whole foods, be low in processed sugars, and easy to prepare.
You must respond with only a valid JSON object that conforms to the following TypeScript type, including a 'summary' of the plan's goals. Do not include any markdown formatting or other text.
\`\`\`typescript
type GenerateMealPlanOutput = {
  breakfast: { name: string; description: string; };
  lunch: { name: string; description: string; };
  dinner: { name: string; description: string; };
  snack: { name: string; description: string; };
  summary: string;
}
\`\`\``;

    const openrouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI nutritionist that creates personalized meal plans. You always respond with only a valid JSON object as requested.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
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
    const validatedResponse = GenerateMealPlanOutputSchema.parse(responseJson);

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Meal plan generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

