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

const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateTimelineInputSchema.parse(body);

    const prompt = `Generate a potential future health timeline based on the user's data, assuming NO lifestyle changes. Create three events: 1-2 years, 5 years, and 10+ years.
The predictions should be realistic but gentle, directly related to the key risk factors, and aim to motivate positive change.
User's Risk Score: ${input.riskScore}
User's Key Factors: ${input.keyFactors.join(', ')}
For each event, provide a timeframe, a prediction, and a suggestion. Respond with only a valid JSON object conforming to the GenerateTimelineOutput schema.`;

    console.log("Received input:", input);

    const openrouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI that predicts future health timelines based on risk factors. You always respond with only a valid JSON object as requested.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    console.log("OpenRouter response status:", openrouterRes.status);
    if (!openrouterRes.ok) {
      const error = await openrouterRes.json();
      console.error("OpenRouter API error:", error);
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await openrouterRes.json();
    console.log("Raw response from OpenRouter:", data);

    const responseText = data.choices?.[0]?.message?.content;

    if (!responseText) {
      console.error("No response content from OpenRouter");
      throw new Error('No response content from OpenRouter');
    }

    const responseJson = JSON.parse(responseText);
    console.log("Parsed response JSON:", responseJson);

    const validatedResponse = GenerateTimelineOutputSchema.parse(responseJson);

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Timeline generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

