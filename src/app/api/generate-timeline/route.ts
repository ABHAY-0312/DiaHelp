import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

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

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

export async function POST(req: NextRequest) {
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

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log("Raw Gemini response:", responseText);

    // Clean up the response text
    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/```json\n?/g, "");
    cleanedText = cleanedText.replace(/```\n?/g, "");
    cleanedText = cleanedText.replace(/^\s*/, "");
    
    console.log("Cleaned response text:", cleanedText);

    const responseJson = JSON.parse(cleanedText);
    console.log("Parsed JSON:", responseJson);
    
    const validatedResponse = GenerateTimelineOutputSchema.parse(responseJson);
    console.log("Validated response:", validatedResponse);

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    console.error("Timeline generation error details:", e);
    
    if (e instanceof ZodError) {
      console.error("Zod validation error:", e.errors);
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    
    if (e instanceof SyntaxError) {
      console.error("JSON parsing error:", e.message);
      return NextResponse.json({ error: 'JSON parsing failed', message: e.message }, { status: 500 });
    }
    
    console.error("General timeline generation error:", e.message);
    return NextResponse.json({ error: 'Timeline generation failed', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

