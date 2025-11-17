
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

const GenerateOrganInsightInputSchema = z.object({
  organ: z.enum(['pancreas', 'liver', 'heart', 'kidneys', 'adipose']),
  riskFactor: z.string().describe("The primary health risk factor associated with this organ, e.g., 'High BMI' or 'Fasting Glucose'."),
});
export type GenerateOrganInsightInput = z.infer<typeof GenerateOrganInsightInputSchema>;

const GenerateOrganInsightOutputSchema = z.object({
  insight: z.string().describe("A concise, one or two-sentence educational insight explaining the connection between the organ and the risk factor."),
});
export type GenerateOrganInsightOutput = z.infer<typeof GenerateOrganInsightOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organ, riskFactor } = GenerateOrganInsightInputSchema.parse(body);

    const prompt = `You are a health educator. Respond with ONLY a valid JSON object that conforms to the following schema:
\`\`\`json
{
  "type": "object",
  "properties": {
    "insight": { "type": "string" }
  },
  "required": ["insight"]
}
\`\`\`
Provide a concise, easy-to-understand explanation (1-2 sentences) of the role of the **${organ}** and how it's impacted by the health factor: **${riskFactor}**. Keep the tone educational and encouraging.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));


    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Organ insight generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
