
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
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
  interpretation: z.string().describe("An interpretation of the extracted results, highlighting any values that are outside of their reference ranges and what they might indicate. This is NOT a medical diagnosis and you MUST include a disclaimer to consult a healthcare professional."),
  extractedFields: z.array(ExtractedFieldSchema).describe('A list of key data fields extracted from the document.'),
  extractedMedications: z.array(ExtractedMedicationSchema).describe('A list of medications extracted from the document, if any.'),
});
export type AnalyzeDocumentOutput = z.infer<typeof AnalyzeDocumentOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        documentType: {
          type: 'string',
          enum: ['lab_result', 'prescription', 'other', 'not_a_document'],
        },
        summary: { type: 'string' },
        interpretation: { type: 'string' },
        extractedFields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'string' },
              referenceRange: { type: 'string' },
            },
            required: ['label', 'value'],
          },
        },
        extractedMedications: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    dosage: { type: 'string' },
                    frequency: { type: 'string' },
                },
                required: ['name', 'dosage', 'frequency'],
            }
        }
      },
      required: ['documentType', 'summary', 'interpretation', 'extractedFields', 'extractedMedications'],
    },
  },
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

    const prompt = `You are an expert medical data extraction and interpretation AI. Your task is to analyze the provided image of a medical document with high accuracy.

1.  **Classify the document**: Determine if it is a lab result, a prescription, or another type of medical document. If it does not appear to be a medical document at all, classify it as 'not_a_document'.
2.  **Summarize**: Provide a concise, one-sentence summary of the document's purpose (e.g., "This is a lab result for a comprehensive blood panel including lipids and glucose.").
3.  **Extract Data Fields**: Carefully extract all relevant medical data points from the document.
    *   For lab results, identify the test name (label), its resulting value (value), and the reference range if available. Be thorough and look for key markers like **Glucose, HbA1c, Total Cholesterol, LDL, HDL, Triglycerides, and Creatinine**, among others.
    *   For prescriptions, extract the medication name, its dosage, and the frequency of administration.
4.  **Interpret the Results**: Analyze the extracted fields. If any values are outside their given reference ranges, explain what this could potentially mean in simple, easy-to-understand terms. If ranges aren't provided, use standard medical knowledge. If all values are normal, state that.
5.  **Add Disclaimer**: Conclude the interpretation with a clear, bolded disclaimer: "**Disclaimer: This is an AI-generated interpretation and is not a substitute for professional medical advice. Please consult with a qualified healthcare provider to discuss your results.**"
6.  **Populate Output**: Fill the output fields with the extracted data and the full interpretation. Do not invent or hallucinate data. If a specific piece of information is not present, leave the corresponding field empty.
`;

    const result = await model.generateContent([prompt, imagePart]);
    const responseJson = JSON.parse(result.response.text());

    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Document analysis failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
