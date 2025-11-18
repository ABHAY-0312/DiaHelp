import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

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
  interpretation: z.string().optional().describe("An interpretation of the extracted results, highlighting any values that are outside of their reference ranges and what they might indicate. This is NOT a medical diagnosis and you MUST include a disclaimer to consult a healthcare professional."),
  extractedFields: z.array(ExtractedFieldSchema).describe('A list of key data fields extracted from the document.'),
  extractedMedications: z.array(ExtractedMedicationSchema).describe('A list of medications extracted from the document, if any.'),
});
export type AnalyzeDocumentOutput = z.infer<typeof AnalyzeDocumentOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-pro'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentDataUri } = AnalyzeDocumentInputSchema.parse(body);

    const mimeTypeMatch = documentDataUri.match(/^data:(image\/\w+);base64,/);
    if (!mimeTypeMatch) {
      return NextResponse.json({ error: 'Invalid data URI format.' }, { status: 400 });
    }
    
    const imagePart = {
      inlineData: {
        data: documentDataUri.split(',')[1],
        mimeType: mimeTypeMatch[1],
      },
    };

    const prompt = `Analyze the provided medical document image with high accuracy. You must respond with only a valid JSON object that conforms to the AnalyzeDocumentOutput schema.
Instructions:
1.  **Classify**: Determine if it's a 'lab_result', 'prescription', 'other', or 'not_a_document'.
2.  **Summarize**: Provide a one-sentence summary.
3.  **Extract Data**:
    *   For lab results, extract 'label', 'value', and 'referenceRange'. Look for key markers like Glucose, HbA1c, Cholesterol, etc.
    *   For prescriptions, extract 'name', 'dosage', and 'frequency'.
4.  **Interpret**: Analyze extracted fields. Explain out-of-range values simply. If normal, state that. If no interpretation is possible, omit the field.
5.  **Disclaimer**: If you provide an interpretation, it MUST conclude with the exact text: "**Disclaimer: This is an AI-generated interpretation and is not a substitute for professional medical advice. Please consult with a qualified healthcare provider to discuss your results.**"
6.  **Output**: Populate the JSON fields. Do not invent data. If a field is not present, omit it or use an empty array. Do not include any markdown formatting or other text outside the JSON object.`;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));

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

