
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

const ModerateTextInputSchema = z.object({
  textToCheck: z.string().describe("The text content that needs to be moderated."),
});
export type ModerateTextInput = z.infer<typeof ModerateTextInputSchema>;

const ModerateTextOutputSchema = z.object({
  isAppropriate: z.boolean().describe("Whether the provided text is considered appropriate or not."),
});
export type ModerateTextOutput = z.infer<typeof ModerateTextOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ],
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { textToCheck } = ModerateTextInputSchema.parse(body);

    const prompt = `You are a content moderation expert. Your task is to determine if the following text contains any abusive, hateful, harassing, or otherwise inappropriate content. Your only output should be a boolean flag.

Text to analyze:
---
${textToCheck}
---
`;
    // We don't actually care about the LLM's text response, only whether the safety settings were triggered.
    await model.generateContent(prompt);

    // If generateContent completes without throwing, the content is considered appropriate.
    return NextResponse.json({ isAppropriate: true });

  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    // Check if the error is due to a safety block
    if (e.message && (e.message.includes('safety') || e.message.includes('blocked'))) {
      return NextResponse.json({ isAppropriate: false });
    }
    console.error("Text moderation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
