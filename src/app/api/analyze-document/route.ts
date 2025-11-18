
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const AnalyzeDocumentInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "An image of a medical document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type AnalyzeDocumentInput = z.infer<typeof AnalyzeDocumentInputSchema>;

const ExtractedFieldSchema = z.object({
  label: z.string().describe('The name of the test or field (e.g., "HbA1c", "Total Cholesterol").'),
  value: z.string().describe('The value of the test or field (e.g., "7.5%", "200 mg/dL").'),
  referenceRange: z.string().optional().describe('The normal or reference range, if provided.'),
});

const ExtractedMedicationSchema = z.object({
    name: z.string().describe('The name of the medication.'),
    dosage: z.string().describe('The dosage information (e.g., "500mg").'),
    frequency: z.string().describe('How often the medication should be taken (e.g., "Once daily").'),
})

const AnalyzeDocumentOutputSchema = z.object({
  documentType: z.enum(['lab_result', 'prescription', 'other', 'not_a_document']).describe('The classified type of the document.'),
  summary: z.string().describe("A brief, one-sentence summary of the document's main content."),
  interpretation: z.string().describe("An interpretation of the extracted results, highlighting any values that are outside of their reference ranges and what they might indicate. This is NOT a medical diagnosis and you MUST include a disclaimer to consult a healthcare professional."),
  extractedFields: z.array(ExtractedFieldSchema).describe('A list of key data fields extracted from the document.'),
  extractedMedications: z.array(ExtractedMedicationSchema).describe('A list of medications extracted from the document, if any.'),
});
export type AnalyzeDocumentOutput = z.infer<typeof AnalyzeDocumentOutputSchema>;

const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentDataUri } = AnalyzeDocumentInputSchema.parse(body);

    const prompt = `Analyze the provided medical document image with high accuracy. You must respond with only a valid JSON object that conforms to the AnalyzeDocumentOutput schema.
Instructions:
1.  **Classify**: Determine if it's a 'lab_result', 'prescription', 'other', or 'not_a_document'.
2.  **Summarize**: Provide a one-sentence summary.
3.  **Extract Data**:
    *   For lab results, extract 'label', 'value', and 'referenceRange'. Look for key markers like Glucose, HbA1c, Cholesterol, etc.
    *   For prescriptions, extract 'name', 'dosage', and 'frequency'.
4.  **Interpret**: Analyze extracted fields. Explain out-of-range values simply. If normal, state that.
5.  **Disclaimer**: Your interpretation MUST conclude with the exact text: "**Disclaimer: This is an AI-generated interpretation and is not a substitute for professional medical advice. Please consult with a qualified healthcare provider to discuss your results.**"
6.  **Output**: Populate the JSON fields. Do not invent data. If a field is not present, omit it or use an empty array. Do not include any markdown formatting or other text outside the JSON object.`;

    const openrouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: documentDataUri } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
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
    const validatedResponse = AnalyzeDocumentOutputSchema.parse(responseJson);

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Document analysis failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

