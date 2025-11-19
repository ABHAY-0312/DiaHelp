
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callGeminiWithFallback } from '@/lib/gemini-client';

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
  interpretation: z.string().optional().describe("An interpretation of the extracted results, highlighting any values that are outside of their reference ranges and what they might indicate."),
  extractedFields: z.array(ExtractedFieldSchema).describe('A list of key data fields extracted from the document.'),
  extractedMedications: z.array(ExtractedMedicationSchema).describe('A list of medications extracted from the document, if any.'),
});
export type AnalyzeDocumentOutput = z.infer<typeof AnalyzeDocumentOutputSchema>;

export async function POST(req: NextRequest) {
  // Fallback document analysis to ensure we always return something useful
  const generateFallbackAnalysis = () => {
    return {
      documentType: "other" as const,
      summary: "Document analysis is temporarily unavailable due to high server demand.",
      interpretation: "We're unable to analyze your document image right now. Please try again later or consult with a healthcare professional for manual review.",
      extractedFields: [],
      extractedMedications: []
    };
  };

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

    const prompt = `Analyze the provided medical document image and respond with only a valid JSON object in this exact format:
{
  "documentType": "lab_result" | "prescription" | "other" | "not_a_document",
  "summary": "One-sentence summary of the document content",
  "interpretation": "Analysis of results highlighting values outside reference ranges",
  "extractedFields": [
    {
      "label": "Test Name",
      "value": "Test Value",
      "referenceRange": "Normal Range (optional)"
    }
  ],
  "extractedMedications": [
    {
      "name": "Medication Name",
      "dosage": "Dosage Amount",
      "frequency": "How often taken"
    }
  ]
}

Instructions:
1. Classify document type accurately
2. Extract key health data (HbA1c, Glucose, Cholesterol, etc.)
3. Extract medication information if present
4. Provide clear interpretation of results
5. Use empty arrays for missing data`;

    // Add timeout for Gemini API
    try {
      const result = await callGeminiWithFallback([prompt, imagePart], 'gemini-2.5-pro', 15000);
      const responseText = result.response.text();
      
      if (!responseText || responseText.trim().length === 0) {
        console.warn("Empty response from Gemini, using fallback analysis");
        return NextResponse.json(generateFallbackAnalysis());
      }

      // Clean up the response text
      let cleanedText = responseText.trim();
      cleanedText = cleanedText.replace(/```json\n?/g, "");
      cleanedText = cleanedText.replace(/```\n?/g, "");
      
      let responseJson;
      try {
        responseJson = JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn("Failed to parse Gemini response, using fallback analysis:", parseError);
        return NextResponse.json(generateFallbackAnalysis());
      }

      // Use safe validation
      const validationResult = AnalyzeDocumentOutputSchema.safeParse(responseJson);
      if (!validationResult.success) {
        console.warn("Document analysis validation failed, using fallback analysis:", validationResult.error);
        return NextResponse.json(generateFallbackAnalysis());
      }

      return NextResponse.json(validationResult.data);
    } catch (geminiError: any) {
      console.warn("Gemini API failed, using fallback analysis:", geminiError.message);
      return NextResponse.json(generateFallbackAnalysis());
    }

  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Document analysis failed completely:", e);
    return NextResponse.json(generateFallbackAnalysis());
  }
}

