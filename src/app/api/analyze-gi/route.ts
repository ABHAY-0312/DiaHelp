
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

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

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mealDescription } = AnalyzeGIInputSchema.parse(body);

    const prompt = `As a nutritional expert on Glycemic Index (GI), analyze the user's meal and respond with only a valid JSON object conforming to the AnalyzeGIOutput schema.
Meal Description: "${mealDescription}".
Instructions:
1.  **Estimate GI**: Estimate a single GI value for the meal (1-100).
2.  **Classify**: Classify as 'Low' (1-55), 'Medium' (56-69), or 'High' (70+).
3.  **Explain**: Provide a 1-2 sentence explanation of what this GI level means for blood sugar.
If the description is not food-related, provide a low GI and a generic explanation.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));

    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("GI analysis failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
