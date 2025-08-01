
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
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

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        timeline: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timeframe: { type: 'string' },
              prediction: { type: 'string' },
              suggestion: { type: 'string' },
            },
            required: ['timeframe', 'prediction', 'suggestion'],
          },
        },
      },
      required: ['timeline'],
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateTimelineInputSchema.parse(body);

    const prompt = `You are a predictive health analyst. Based on the user's current diabetes risk score and key risk factors, generate a potential future health timeline.

This timeline should be a projection of what could happen if the user makes NO significant changes to their lifestyle. Create three timeline events: one for 1-2 years, one for 5 years, and one for 10+ years.

For each event, provide a realistic but gentle prediction and a corresponding suggestion for how to change that outcome. The predictions should be directly related to the provided key risk factors. For example, if a key factor is "High BMI," the timeline might predict weight gain and joint issues. If a factor is "Elevated Glucose," it might predict pre-diabetes or energy level fluctuations.

The tone should be cautionary but not alarmist. The goal is to motivate positive change, not to scare the user.

User's Risk Score: ${input.riskScore}
User's Key Factors:
${input.keyFactors.map(kf => `- ${kf}`).join('\n')}
`;

    const result = await model.generateContent(prompt);
    const responseJson = JSON.parse(result.response.text());

    // Validate the output against our Zod schema to be safe
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
