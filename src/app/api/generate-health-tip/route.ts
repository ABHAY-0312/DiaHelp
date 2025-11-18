import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const GenerateHealthTipOutputSchema = z.object({
  tip: z.string().min(1, "Tip cannot be empty."),
});
export type HealthTip = z.infer<typeof GenerateHealthTipOutputSchema>;

const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function fetchAndValidateHealthTip(retryCount = 0): Promise<HealthTip> {
  const prompt = `You are an AI assistant that provides a single health tip. Your response MUST be a valid JSON object and nothing else. It must conform exactly to this schema: { "tip": "string" }. The 'tip' must be a single, encouraging sentence. Do not include any markdown, text, or formatting outside of the JSON object.

Example of a perfect response:
{ "tip": "Drinking a glass of water before a meal can help you feel fuller and eat less." }`;

  console.log("Sending prompt to OpenRouter:", prompt);

  const openrouterRes = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: 'You are an AI that provides short, encouraging health tips. You always and only respond with a valid JSON object as requested.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 1.2,
    }),
  });

  console.log("OpenRouter response status:", openrouterRes.status);

  if (!openrouterRes.ok) {
    const error = await openrouterRes.json();
    console.error("OpenRouter API error:", error);
    throw new Error(error.error?.message || 'OpenRouter API error');
  }

  const data = await openrouterRes.json();
  console.log("Raw response from OpenRouter:", data);

  const responseText = data.choices?.[0]?.message?.content;

  try {
    if (!responseText) {
      console.error("No response content from OpenRouter");
      throw new Error('No response content from OpenRouter');
    }
    const responseJson = JSON.parse(responseText);
    console.log("Parsed response JSON:", responseJson);
    return GenerateHealthTipOutputSchema.parse(responseJson);
  } catch (error) {
    console.error("Validation or parsing error:", error);
    if (retryCount < 2) {
      console.warn(`Health tip validation failed, retrying... (Attempt ${retryCount + 1})`, error);
      return fetchAndValidateHealthTip(retryCount + 1);
    }
    console.error("Health tip generation failed after multiple retries.", error);
    throw new Error("Failed to generate a valid health tip after multiple attempts.");
  }
}


export async function GET(req: NextRequest) {
  try {
    const validatedResponse = await fetchAndValidateHealthTip();
    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    console.error("Health tip generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

