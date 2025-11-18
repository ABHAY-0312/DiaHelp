
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const GenerateReportInputSchema = z.object({
  patientName: z.string().describe('The name of the patient.'),
  riskScore: z.number().describe('The calculated diabetes risk score (0-100).'),
  confidenceScore: z.number().describe("The model's confidence in the prediction (0-100)."),
  keyFactors: z
    .array(z.string())
    .describe('The top key factors contributing to the risk score (e.g., "High BMI", "Elevated Glucose").'),
  healthSuggestions: z.array(z.string()).describe('A list of general health suggestions.'),
});
export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

const GenerateReportOutputSchema = z.object({
  report: z.string().describe('A concise, personalized diabetes risk assessment summary formatted as an HTML string.'),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;

const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateReportInputSchema.parse(body);

    const prompt = `Generate a brief, encouraging, and personalized health summary for ${input.patientName}. Respond with only a valid JSON object with a single "report" field containing an HTML string.

Data:
- Risk Score: ${input.riskScore}/100 (Model confidence: ${input.confidenceScore}%)
- Key Risk Factors: ${input.keyFactors.join(', ')}
- Personalized Suggestions: ${input.healthSuggestions.join('; ')}

Instructions:
1.  Write a concise and positive summary.
2.  Use HTML tags for formatting (e.g., <p>, <strong>, <ul>, <li>).
3.  Start with a paragraph summarizing the risk score.
4.  Create a <ul> list for the key risk factors, using <li> for each.
5.  Create another <ul> list for the personalized suggestions.
6.  End with a paragraph reminding the user to consult a healthcare professional.
7.  The entire output for the "report" field must be a single, valid HTML string.`;

    const openrouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant that generates personalized health reports as HTML strings within a JSON object.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      }),
    });

    if (!openrouterRes.ok) {
      const error = await openrouterRes.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await openrouterRes.json();
    const responseText = data.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error('No response content from OpenRouter');
    }

    const responseJson = JSON.parse(responseText);
    const validatedResponse = GenerateReportOutputSchema.parse(responseJson);

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("AI Report generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

