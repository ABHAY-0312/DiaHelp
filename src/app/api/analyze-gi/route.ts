
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

    const prompt = `Analyze this meal and respond with ONLY a valid JSON object in this exact format:

{
  "estimatedGI": 65,
  "classification": "Medium",
  "explanation": "This meal has a medium GI and will cause a moderate rise in blood sugar levels."
}

Meal to analyze: "${mealDescription}"

Rules:
- estimatedGI: Must be a NUMBER between 1-100
- classification: Must be exactly "Low", "Medium", or "High"
- explanation: 1-2 sentences about blood sugar impact
- GI ranges: Low (1-55), Medium (56-69), High (70+)
- Return ONLY the JSON object, no other text`;

    try {
      const result = await callGeminiWithFallback(prompt, 'gemini-2.5-flash', 10000);
      const responseText = result.response.text();
      
      if (!responseText || responseText.trim().length === 0) {
        console.warn("Empty response from Gemini, using fallback");
        return NextResponse.json(fallbackAnalysis);
      }

      // Clean up the response text
      let cleanedText = responseText.trim();
      cleanedText = cleanedText.replace(/```json\n?/g, "");
      cleanedText = cleanedText.replace(/```\n?/g, "");
      cleanedText = cleanedText.replace(/^[^{]*/, ""); // Remove text before first {
      cleanedText = cleanedText.replace(/[^}]*$/, ""); // Remove text after last }
      
      let responseJson;
      try {
        responseJson = JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn("Failed to parse Gemini response, using fallback:", parseError);
        console.warn("Raw response:", responseText);
        return NextResponse.json(fallbackAnalysis);
      }

      // Ensure all required fields exist with defaults
      const processedResponse = {
        estimatedGI: responseJson.estimatedGI || responseJson.gi || responseJson.glycemicIndex || 50,
        classification: responseJson.classification || "Medium",
        explanation: responseJson.explanation || responseJson.description || "GI analysis completed with default values."
      };

      // Convert estimatedGI to number if it's a string
      if (typeof processedResponse.estimatedGI === 'string') {
        processedResponse.estimatedGI = parseInt(processedResponse.estimatedGI) || 50;
      }

      // Validate classification
      if (!['Low', 'Medium', 'High'].includes(processedResponse.classification)) {
        processedResponse.classification = processedResponse.estimatedGI <= 55 ? 'Low' : 
                                         processedResponse.estimatedGI <= 69 ? 'Medium' : 'High';
      }

      // Use safe validation
      const validationResult = AnalyzeGIOutputSchema.safeParse(processedResponse);
      if (!validationResult.success) {
        console.warn("GI analysis validation failed, using fallback:", validationResult.error);
        console.warn("Processed response:", processedResponse);
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

