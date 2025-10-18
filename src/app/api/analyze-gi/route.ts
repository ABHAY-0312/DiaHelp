
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
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

    const prompt = `You are a nutritional expert specializing in the Glycemic Index (GI). A user has described their meal. Your task is to analyze it and provide an estimated GI, a classification, and a simple explanation. Respond with ONLY a valid JSON object that conforms to the following schema:

\`\`\`json
{
  "type": "object",
  "properties": {
    "estimatedGI": { "type": "number" },
    "classification": { "type": "string", "enum": ["Low", "Medium", "High"] },
    "explanation": { "type": "string" }
  },
  "required": ["estimatedGI", "classification", "explanation"]
}
\`\`\`

Here are your instructions:
1.  **Analyze the Meal**: Read the user's meal description: "${mealDescription}".
2.  **Estimate GI**: Based on the components of the meal, estimate a single Glycemic Index value for the entire meal on a scale of 1-100.
3.  **Classify**: Classify the GI as 'Low' (1-55), 'Medium' (56-69), or 'High' (70+).
4.  **Explain**: Write a brief, simple explanation (1-2 sentences) about what this GI level means for blood sugar. For example, a high GI meal might cause a rapid spike, while a low GI meal leads to a slower, more gradual rise.

If the description is not food-related, provide a low GI score and a generic explanation. Be concise and educational.
`;

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
