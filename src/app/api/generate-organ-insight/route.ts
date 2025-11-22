
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callGeminiWithFallback } from '@/lib/gemini-client';

const GenerateOrganInsightInputSchema = z.object({
  organ: z.string().describe('The name of the organ (e.g., "pancreas", "liver").'),
  riskFactor: z.string().describe('The primary health risk factor associated with this organ for the user (e.g., "High BMI", "Elevated Glucose").'),
});
export type GenerateOrganInsightInput = z.infer<typeof GenerateOrganInsightInputSchema>;

const GenerateOrganInsightOutputSchema = z.object({
  insight: z.string().describe("A brief, 1-2 sentence insight about how the specified risk factor affects the organ's health, written in an encouraging and educational tone."),
});
export type GenerateOrganInsightOutput = z.infer<typeof GenerateOrganInsightOutputSchema>;

export async function POST(req: NextRequest) {
  // Fallback organ insight when AI fails
  const fallbackInsight = {
    insight: "We're experiencing technical difficulties. Please consult with your healthcare provider for personalized insights about how your health factors may affect your organs."
  };

  try {
    const body = await req.json();
    const { organ, riskFactor } = GenerateOrganInsightInputSchema.parse(body);

    const prompt = `Provide a concise, educational insight (1-2 sentences) on how "${riskFactor}" impacts the ${organ}. The tone should be encouraging. Respond with only a valid JSON object conforming to the GenerateOrganInsightOutput schema.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));
    
    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json(fallbackInsight);
    }
    console.error("Organ insight generation failed.", e);
    
    // Return fallback insight instead of error
    return NextResponse.json(fallbackInsight);
  }
}
