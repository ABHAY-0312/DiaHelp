
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callGeminiWithFallback } from '@/lib/gemini-client';

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

export async function POST(req: NextRequest) {
  // Fallback GI analysis to ensure we always return something useful
  const fallbackAnalysis = {
    estimatedGI: 50,
    classification: "Medium" as const,
    explanation: "GI analysis is temporarily unavailable. This is a moderate estimate. Please try again later."
  };

  try {
    const body = await req.json();
    const { mealDescription } = AnalyzeGIInputSchema.parse(body);

    const prompt = `As a nutritional expert on Glycemic Index (GI), analyze the user's meal and respond with only a valid JSON object conforming to the AnalyzeGIOutput schema.
Meal Description: "${mealDescription}".
Instructions:
1.  **Estimate GI**: Estimate a single GI value for the meal (1-100).
2.  **Classify**: Classify as 'Low' (1-55), 'Medium' (56-69), or 'High' (70+).
3.  **Explain**: Provide a 1-2 sentence explanation of what this GI level means for blood sugar.
If the description is not food-related, provide a low GI and a generic explanation. Do not include any markdown formatting or other text outside the JSON object.`;

    try {
      const result = await callGeminiWithFallback(prompt, 'gemini-2.5-pro', 10000);
      const responseText = result.response.text();
      
      if (!responseText || responseText.trim().length === 0) {
        console.warn("Empty response from Gemini, using fallback");
        return NextResponse.json(fallbackAnalysis);
      }

      // Clean up the response text
      let cleanedText = responseText.trim();
      cleanedText = cleanedText.replace(/```json\n?/g, "");
      cleanedText = cleanedText.replace(/```\n?/g, "");
      
      let responseJson;
      try {
        responseJson = JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn("Failed to parse Gemini response, using fallback:", parseError);
        return NextResponse.json(fallbackAnalysis);
      }

      // Use safe validation
      const validationResult = AnalyzeGIOutputSchema.safeParse(responseJson);
      if (!validationResult.success) {
        console.warn("GI analysis validation failed, using fallback:", validationResult.error);
        return NextResponse.json(fallbackAnalysis);
      }

      return NextResponse.json(validationResult.data);
    } catch (geminiError: any) {
      console.warn("Gemini API failed, using fallback analysis:", geminiError.message);
      return NextResponse.json(fallbackAnalysis);
    }

  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("GI analysis failed completely:", e);
    return NextResponse.json(fallbackAnalysis);
  }
}

