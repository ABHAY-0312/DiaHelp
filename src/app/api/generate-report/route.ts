
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

const GenerateReportInputSchema = z.object({
  patientName: z.string().describe('The name of the patient.'),
  riskScore: z.number().describe('The calculated diabetes risk score (0-100).'),
  confidenceScore: z.number().describe('The model\'s confidence in the prediction (0-100).'),
  keyFactors: z
    .array(z.string())
    .describe('The top key factors contributing to the risk score (e.g., "High BMI", "Elevated Glucose").'),
  healthSuggestions: z.array(z.string()).describe('A list of general health suggestions.'),
});
export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

const GenerateReportOutputSchema = z.object({
  report: z.string().describe('A concise, personalized diabetes risk assessment summary.'),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        report: { type: 'string' },
      },
      required: ['report'],
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateReportInputSchema.parse(body);

    const prompt = `You are a digital health assistant for DiaHelper.

Generate a brief, encouraging, and personalized health summary for ${input.patientName}.

Your simulated risk score is ${input.riskScore}/100. This score is based on a formula that weighs several health factors. The model is ${input.confidenceScore}% confident in this assessment.

Here's a breakdown of your key risk factors and why they are important:
${input.keyFactors.map(kf => `- **${kf}**: This factor played a significant role in your assessment. Effectively managing this can have a positive impact on your overall health.`).join('\n')}

Here are some personalized suggestions based on your profile to help you improve your health:
${input.healthSuggestions.map(hs => `- ${hs}`).join('\n')}

Keep the summary concise and positive. End by reminding the user to consult a healthcare professional for medical advice. IMPORTANT: Include a disclaimer that this is a simulated prediction for educational purposes and not a real medical diagnosis.`;

    const result = await model.generateContent(prompt);
    const responseJson = JSON.parse(result.response.text());

    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("AI Report generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
