
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
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
  model: 'gemini-2.5-pro'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateReportInputSchema.parse(body);

    const prompt = `Generate a brief, encouraging, and personalized health summary for ${input.patientName}. Respond with only a valid JSON object with a single "report" string field.

Simulated risk score: ${input.riskScore}/100. (Model confidence: ${input.confidenceScore}%)

Key Risk Factors:
${input.keyFactors.map(kf => `- **${kf}**: This factor played a significant role. Managing it can have a positive impact.`).join('\n')}

Personalized Suggestions:
${input.healthSuggestions.map(hs => `- ${hs}`).join('\n')}

Keep the summary concise and positive. End by reminding the user to consult a healthcare professional.`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    // Replace markdown bold with strong tags
    responseText = responseText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));


    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("AI Report generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
