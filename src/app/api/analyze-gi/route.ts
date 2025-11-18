
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const AnalyzeGIInputSchema = z.object({
  mealDescription: z.string().describe('A description of the meal eaten by the user.'),
});
export type AnalyzeGIInput = z.infer<typeof AnalyzeGIInputSchema>;

const AnalyzeGIOutputSchema = z.object({
  estimatedGI: z.number().describe("A numerical estimation of the meal's Glycemic Index (1-100)."),
  classification: z.enum(['Low', 'Medium', 'High']).describe("Classification of the meal's GI."),
  explanation: z.string().describe("A brief explanation of what the GI means and how this meal might impact blood sugar levels."),
});
export type AnalyzeGIOutput = z.infer<typeof AnalyzeGIOutputSchema>;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mealDescription } = AnalyzeGIInputSchema.parse(body);

    const prompt = `As a nutritional expert on Glycemic Index (GI), analyze the user's meal and respond with only a valid JSON object conforming to the following TypeScript type:
\`\`\`typescript
type AnalyzeGIOutput = {
  estimatedGI: number; // A numerical estimation of the meal's Glycemic Index (1-100).
  classification: 'Low' | 'Medium' | 'High'; // Classification of the meal's GI.
  explanation: string; // A brief explanation of what the GI means and how this meal might impact blood sugar levels.
}
\`\`\`
Meal Description: "${mealDescription}".
Instructions:
1.  **Estimate GI**: Estimate a single GI value for the meal (1-100).
2.  **Classify**: Classify as 'Low' (1-55), 'Medium' (56-69), or 'High' (70+).
3.  **Explain**: Provide a 1-2 sentence explanation of what this GI level means for blood sugar.
If the description is not food-related, provide a low GI and a generic explanation. Do not include any markdown formatting like \`\`\`json or any other text outside of the JSON object.`;

    const openrouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI assistant that analyzes meals for their Glycemic Index. You always respond with only a valid JSON object as requested.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
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
    const validatedResponse = AnalyzeGIOutputSchema.parse(responseJson);

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("GI analysis failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

