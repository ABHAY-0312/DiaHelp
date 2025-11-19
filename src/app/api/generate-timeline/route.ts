import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callGeminiWithFallback } from '@/lib/gemini-client';

const GenerateTimelineInputSchema = z.object({
  riskScore: z.number().describe("The user's current diabetes risk score (0-100)."),
  keyFactors: z.array(z.string()).describe("List of the user's key risk factors (e.g., 'High BMI', 'Elevated Glucose', 'Poor Sleep')."),
});
export type GenerateTimelineInput = z.infer<typeof GenerateTimelineInputSchema>;


const TimelineEventSchema = z.object({
    timeframe: z.string().describe("The time period for this event (e.g., 'In 1-2 Years', 'In 5 Years', 'In 10+ Years')."),
    prediction: z.string().describe("A concise, narrative prediction of potential health changes or challenges during this timeframe if current habits continue."),
    suggestion: z.string().describe("A brief, actionable suggestion to mitigate the predicted risk for this timeframe."),
});

const GenerateTimelineOutputSchema = z.object({
  timeline: z.array(TimelineEventSchema).describe("A list of timeline events, ordered chronologically."),
});
export type GenerateTimelineOutput = z.infer<typeof GenerateTimelineOutputSchema>;

export async function POST(req: NextRequest) {
  // Fallback timeline to ensure we always return something useful
  const fallbackTimeline = {
    timeline: [
      {
        timeframe: "In 1-2 Years",
        prediction: "With current habits, you may see gradual changes in your health markers that could indicate increased diabetes risk.",
        suggestion: "Start with small changes like taking a 10-minute walk after meals and reducing sugary drinks."
      },
      {
        timeframe: "In 5 Years",
        prediction: "Without lifestyle modifications, your risk factors may become more pronounced, potentially affecting your overall health.",
        suggestion: "Consider working with a healthcare provider to develop a comprehensive plan for diet and exercise."
      },
      {
        timeframe: "In 10+ Years",
        prediction: "Long-term continuation of current patterns may lead to more significant health challenges that require medical management.",
        suggestion: "Regular health screenings and preventive care become increasingly important for early intervention."
      }
    ]
  };

  try {
    const body = await req.json();
    const input = GenerateTimelineInputSchema.parse(body);
    
    console.log("Timeline input:", input);

    const prompt = `You are a health prediction AI. Generate a health timeline based on the user's current data.

User Data:
- Risk Score: ${input.riskScore}/100
- Key Risk Factors: ${input.keyFactors.join(', ')}

Create exactly 3 timeline events for: "In 1-2 Years", "In 5 Years", and "In 10+ Years"

You must respond with ONLY a valid JSON object in this exact format:
{
  "timeline": [
    {
      "timeframe": "In 1-2 Years",
      "prediction": "Brief prediction of health changes if no lifestyle changes are made",
      "suggestion": "One actionable suggestion to improve health"
    },
    {
      "timeframe": "In 5 Years", 
      "prediction": "Medium-term health prediction",
      "suggestion": "One actionable suggestion"
    },
    {
      "timeframe": "In 10+ Years",
      "prediction": "Long-term health prediction", 
      "suggestion": "One actionable suggestion"
    }
  ]
}`;

    console.log("Sending prompt to Gemini:", prompt);

    try {
      const result = await callGeminiWithFallback(prompt, 'gemini-2.5-flash', 15000);
      const responseText = result.response.text();
    
      console.log("Raw Gemini response:", responseText);

      if (!responseText || responseText.trim().length === 0) {
        console.warn("Empty response from Gemini, using fallback");
        return NextResponse.json(fallbackTimeline);
      }

      // Clean up the response text
      let cleanedText = responseText.trim();
      cleanedText = cleanedText.replace(/```json\n?/g, "");
      cleanedText = cleanedText.replace(/```\n?/g, "");
      cleanedText = cleanedText.replace(/^\s*/, "");
      
      console.log("Cleaned response text:", cleanedText);

      let responseJson;
      try {
        responseJson = JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn("JSON parsing failed, using fallback:", parseError);
        return NextResponse.json(fallbackTimeline);
      }
      
      console.log("Parsed JSON:", responseJson);
      
      // Use safe validation
      const validationResult = GenerateTimelineOutputSchema.safeParse(responseJson);
      if (!validationResult.success) {
        console.warn("Timeline validation failed, using fallback:", validationResult.error);
        return NextResponse.json(fallbackTimeline);
      }

      console.log("Validated response:", validationResult.data);
      return NextResponse.json(validationResult.data);
    } catch (geminiError: any) {
      console.warn("All Gemini API keys failed, using fallback:", geminiError.message);
      return NextResponse.json(fallbackTimeline);
    }
  } catch (e: any) {
    console.error("Timeline generation failed, using fallback:", e);
    return NextResponse.json(fallbackTimeline);
  }
}

