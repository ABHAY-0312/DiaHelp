
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callOpenAIWithFallback } from '@/lib/openai-client';

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

export async function POST(req: NextRequest) {
  // Fallback report to ensure we always return something useful
  const fallbackReport = {
    report: `<div class="health-report">
      <h3>Health Assessment Report</h3>
      <p>We're experiencing technical difficulties generating your personalized report right now.</p>
      <p>Based on standard health guidelines, here are some general recommendations:</p>
      <ul>
        <li>Maintain a balanced diet with plenty of vegetables and whole grains</li>
        <li>Engage in regular physical activity (at least 150 minutes per week)</li>
        <li>Monitor your blood sugar levels regularly if at risk</li>
        <li>Stay hydrated and get adequate sleep</li>
        <li>Consult with healthcare professionals for personalized medical advice</li>
      </ul>
      <p><strong>Important:</strong> Please schedule an appointment with your healthcare provider for a comprehensive assessment.</p>
    </div>`
  };

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

    const response = await callOpenAIWithFallback(
      'openai/gpt-3.5-turbo',
      [
        { role: 'system', content: 'You are a helpful AI assistant that generates personalized health reports as HTML strings within a JSON object.' },
        { role: 'user', content: prompt }
      ],
      {
        temperature: 0.5,
        response_format: { type: "json_object" }
      }
    );

    const responseText = response.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error('No response content from OpenAI');
    }

    const responseJson = JSON.parse(responseText);
    const validatedResponse = GenerateReportOutputSchema.parse(responseJson);

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    console.error("AI Report generation failed, using fallback:", e);
    return NextResponse.json(fallbackReport);
  }
}

