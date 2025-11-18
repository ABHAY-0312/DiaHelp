
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const GenerateHealthTipOutputSchema = z.object({
  tip: z.string().describe("A concise, actionable, and encouraging health tip related to diet, exercise, or general wellness, suitable for someone managing diabetes risk."),
});
export type HealthTip = z.infer<typeof GenerateHealthTipOutputSchema>;

const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function GET(req: NextRequest) {
  try {
    const prompt = `Generate a single, interesting, actionable, and encouraging health tip. The tip should be a single sentence.
Respond with ONLY a valid JSON object that conforms to the following schema: { "tip": "string" }.
Do not include any other text or markdown formatting.
Example response: { "tip": "Swapping white bread for whole-wheat is an easy way to boost your fiber intake!" }`;

    const openrouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI that provides short, encouraging health tips. You always respond with only a valid JSON object as requested.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 1.2,
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
    const validatedResponse = GenerateHealthTipOutputSchema.parse(responseJson);

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    console.error("Health tip generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

