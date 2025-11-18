
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const FindHospitalsInputSchema = z.object({
  location: z.string().describe('A location description, such as "San Francisco, CA" or "King County, Washington".'),
});
export type FindHospitalsInput = z.infer<typeof FindHospitalsInputSchema>;

const HospitalSchema = z.object({
    name: z.string().describe("The name of the hospital."),
    address: z.string().describe("The full address of the hospital."),
    phone: z.string().describe("The main phone number of the hospital, formatted as a string (e.g., '+1-800-555-1234')."),
});

const FindHospitalsOutputSchema = z.object({
  hospitals: z.array(HospitalSchema).describe("A list of 3-5 hospitals found in or near the specified location."),
  disclaimer: z.string().describe("A mandatory disclaimer about verifying the information.")
});
export type FindHospitalsOutput = z.infer<typeof FindHospitalsOutputSchema>;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { location } = FindHospitalsInputSchema.parse(body);

    const prompt = `Find 3-5 major hospitals in or near "${location}". You must respond with only a valid JSON object that conforms to the following TypeScript type:
\`\`\`typescript
type FindHospitalsOutput = {
  hospitals: {
    name: string;
    address: string;
    phone: string; // Must be a valid, formatted phone number string.
  }[];
  disclaimer: string; // A mandatory disclaimer about verifying the information.
}
\`\`\`
For each hospital, provide its name, address, and main phone number.
Include the following disclaimer: "Please verify all details with the hospital directly before visiting."
If no reliable information is found, return an empty list for 'hospitals' but still include the disclaimer. Do not include markdown formatting or any other text outside the JSON object.`;

    const openrouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI assistant that finds hospital information. You always respond with only a valid JSON object as requested.' },
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
    const validatedResponse = FindHospitalsOutputSchema.parse(responseJson);

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Hospital finder failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

