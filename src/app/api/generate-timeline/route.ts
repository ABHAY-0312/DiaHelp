import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://gemini-api.example.com/v2.5/pro';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateTimelineInputSchema.parse(body);

    const events = [
      { timeframe: '1-2 years', description: 'Short-term health outlook based on current habits.' },
      { timeframe: '5 years', description: 'Mid-term health projection with potential risks.' },
      { timeframe: '10+ years', description: 'Long-term health forecast assuming no changes.' },
    ];

    const timeline = await Promise.all(
      events.map(async (event) => {
        const prompt = `Based on the user's data:
- Risk Score: ${input.riskScore}
- Key Factors: ${input.keyFactors.join(', ')}

Generate a health prediction for the timeframe: ${event.timeframe}.
Description: ${event.description}

Respond with:
{
  "timeframe": "string",
  "prediction": "string",
  "suggestion": "string"
}`;

        const geminiRes = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GEMINI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            model: 'gemini-2.5-pro',
            temperature: 0.7,
          }),
        });

        if (!geminiRes.ok) {
          const error = await geminiRes.json();
          throw new Error(error.error?.message || 'Gemini API error');
        }

        const data = await geminiRes.json();
        return GenerateTimelineOutputSchema.parse(data);
      })
    );

    return NextResponse.json({ timeline });
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Timeline generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

