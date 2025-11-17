
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
  model: 'gemini-2.5-flash',
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

    // This prompt forces the model to evaluate the text against its safety settings.
    // If the text is inappropriate, the model will throw a safety-related error.
    const prompt = `Analyze if the following text is appropriate: "${textToCheck}"`;
    await model.generateContent(prompt);
    return NextResponse.json({ isAppropriate: true });

  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    // If the model throws an error related to safety, we catch it and flag the content as inappropriate.
    if (e.message && (e.message.includes('safety') || e.message.includes('blocked'))) {
      return NextResponse.json({ isAppropriate: false });
    }
    console.error("Text moderation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
