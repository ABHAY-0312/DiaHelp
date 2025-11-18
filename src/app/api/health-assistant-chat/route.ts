
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
// Removed Gemini import; using fetch for OpenAI

const HealthAssistantChatInputSchema = z.object({
  question: z.string().describe("The user's question about health or diabetes."),
});
export type HealthAssistantChatInput = z.infer<
  typeof HealthAssistantChatInputSchema
>;

const HealthAssistantChatOutputSchema = z.object({
  answer: z
    .string()
    .describe('The helpful, educational answer to the user question.'),
});
export type HealthAssistantChatOutput = z.infer<
  typeof HealthAssistantChatOutputSchema
>;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = HealthAssistantChatInputSchema.parse(body);

    const prompt = `You are an expert, friendly, and knowledgeable digital health assistant for DiaHelper. Provide a direct, clear, and accurate answer to the user's health question. Your tone should be supportive and easy to understand.\nThe user's question is: "${input.question}"`;

    const openrouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        // Optionally add these:
        // 'HTTP-Referer': 'https://your-site-url.com',
        // 'X-Title': 'DiaHelp',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert, friendly, and knowledgeable digital health assistant for DiaHelper.' },
          { role: 'user', content: input.question },
        ],
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!openrouterRes.ok) {
      const error = await openrouterRes.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await openrouterRes.json();
    const responseText = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    const validatedResponse: HealthAssistantChatOutput = {
      answer: responseText,
    };

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Health assistant chat failed.", e);
    return NextResponse.json({ error: 'Internal ServerError', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

