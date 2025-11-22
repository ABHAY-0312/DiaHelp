
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callOpenAIWithFallback } from '@/lib/openai-client';

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

export async function POST(req: NextRequest) {
  // Fallback hospital information to ensure we always return something useful
  const fallbackHospitals = {
    hospitals: [
      {
        name: "General Hospital Information",
        address: "Please search online for hospitals near your location",
        specialty: "General Healthcare",
        contact: "Search online or contact local directory services",
        notes: "We're experiencing technical difficulties. Please use online maps or local directories to find hospitals in your area. For emergencies, dial your local emergency number immediately."
      }
    ],
    searchLocation: "Your Area",
    summary: "We're currently unable to provide specific hospital recommendations. For immediate assistance, please contact local emergency services or search for hospitals near your location using online maps."
  };

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

    const response = await callOpenAIWithFallback(
      'openai/gpt-3.5-turbo',
      [
        { role: 'system', content: 'You are an AI assistant that finds hospital information. You always respond with only a valid JSON object as requested.' },
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
    const validatedResponse = FindHospitalsOutputSchema.parse(responseJson);

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json(fallbackHospitals);
    }
    console.error("Hospital finder failed.", e);
    
    // Return fallback hospitals instead of error message
    return NextResponse.json(fallbackHospitals);
  }
}

