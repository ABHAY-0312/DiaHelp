
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callOpenAIWithFallback } from '@/lib/openai-client';

const GenerateHealthTipOutputSchema = z.object({
  tip: z.string().describe("A concise, actionable, and encouraging health tip related to diet, exercise, or general wellness, suitable for someone managing diabetes risk."),
});
export type HealthTip = z.infer<typeof GenerateHealthTipOutputSchema>;

export async function GET(req: NextRequest) {
  // Always return a fallback tip first to ensure we never fail
  const fallbackTip = {
    tip: "Stay hydrated by drinking at least 8 glasses of water daily to support your metabolism and overall health."
  };

  try {
    const prompt = `Generate a health tip and respond with ONLY this exact JSON format:
{
  "tip": "Your health tip here"
}

The tip should be one encouraging sentence about nutrition, exercise, or wellness. Example tip: "Take a 10-minute walk after each meal to help regulate your blood sugar naturally."`;

    try {
      const data = await callOpenAIWithFallback(
        'openai/gpt-3.5-turbo',
        [
          { role: 'system', content: 'You must respond with only valid JSON in the exact format requested. No other text.' },
          { role: 'user', content: prompt },
        ],
        {
          temperature: 0.8,
          response_format: { type: "json_object" },
          timeout: 10000
        }
      );

      const responseText = data.choices?.[0]?.message?.content;
      console.log("OpenAI response text:", responseText);

      if (!responseText) {
        console.warn("No response text from OpenAI, using fallback");
        return NextResponse.json(fallbackTip);
      }

      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
        console.log("Parsed response JSON:", responseJson);
      } catch (parseError) {
        console.warn("Failed to parse OpenAI response, using fallback:", parseError);
        return NextResponse.json(fallbackTip);
      }

      // Use safe validation
      const validationResult = GenerateHealthTipOutputSchema.safeParse(responseJson);
      if (!validationResult.success) {
        console.warn("Health tip validation failed, using fallback:", validationResult.error);
        return NextResponse.json(fallbackTip);
      }

      return NextResponse.json(validationResult.data);
    } catch (openaiError: any) {
      console.warn("All OpenAI API keys failed, using fallback:", openaiError.message);
      return NextResponse.json(fallbackTip);
    }
  } catch (e: any) {
    console.error("Health tip generation failed, using fallback:", e);
    return NextResponse.json(fallbackTip);
  }
}

