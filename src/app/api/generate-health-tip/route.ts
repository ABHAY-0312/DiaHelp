
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const GenerateHealthTipOutputSchema = z.object({
  tip: z.string().describe("A concise, actionable, and encouraging health tip related to diet, exercise, or general wellness, suitable for someone managing diabetes risk."),
});
export type HealthTip = z.infer<typeof GenerateHealthTipOutputSchema>;

const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function GET(req: NextRequest) {
  // Always return a fallback tip first to ensure we never fail
  const fallbackTip = {
    tip: "Stay hydrated by drinking at least 8 glasses of water daily to support your metabolism and overall health."
  };

  try {
    const prompt = `Generate a single, interesting, actionable, and encouraging health tip (one sentence). Focus on nutrition, simple exercises, mindfulness, or hydration.
Respond with only a valid JSON object conforming to the GenerateHealthTipOutput schema.
Example: "Swapping white bread for whole-wheat is an easy way to boost your fiber intake!"`;

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
      return NextResponse.json(fallbackTip);
    }

    const data = await openrouterRes.json();
    const responseText = data.choices?.[0]?.message?.content;

    if (!responseText) {
      return NextResponse.json(fallbackTip);
    }

    const responseJson = JSON.parse(responseText);
    
    // Safe validation - return fallback if validation fails
    const validationResult = GenerateHealthTipOutputSchema.safeParse(responseJson);
    if (!validationResult.success) {
      console.warn("Health tip validation failed, using fallback:", validationResult.error);
      return NextResponse.json(fallbackTip);
    }

    return NextResponse.json(validationResult.data);
  } catch (e: any) {
    console.error("Health tip generation failed, using fallback:", e);
    return NextResponse.json(fallbackTip);
  }
}

