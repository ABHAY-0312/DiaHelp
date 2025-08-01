
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

const FindHospitalsInputSchema = z.object({
  location: z.string().describe('A location description, such as "San Francisco, CA" or "King County, Washington".'),
});
export type FindHospitalsInput = z.infer<typeof FindHospitalsInputSchema>;

const HospitalSchema = z.object({
    name: z.string().describe("The name of the hospital."),
    address: z.string().describe("The full address of the hospital."),
    phone: z.string().describe("The main phone number of the hospital."),
});

const FindHospitalsOutputSchema = z.object({
  hospitals: z.array(HospitalSchema).describe("A list of 3-5 hospitals found in or near the specified location."),
  disclaimer: z.string().describe("A mandatory disclaimer about verifying the information.")
});
export type FindHospitalsOutput = z.infer<typeof FindHospitalsOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        hospitals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              address: { type: 'string' },
              phone: { type: 'string' },
            },
            required: ['name', 'address', 'phone'],
          },
        },
        disclaimer: { type: 'string' },
      },
      required: ['hospitals', 'disclaimer'],
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { location } = FindHospitalsInputSchema.parse(body);

    const prompt = `You are a helpful assistant that finds local medical facilities.

A user is looking for hospitals in the following location: ${location}.

Based on your knowledge, please list 3-5 major hospitals in or very close to this area.

For each hospital, provide:
- The full name of the hospital.
- Its address.
- Its main contact phone number.

IMPORTANT: You must also include the following disclaimer in the 'disclaimer' field: "Please verify all details with the hospital directly before visiting."

Do not invent information. If you cannot find reliable information for the location, return an empty list of hospitals but still include the disclaimer.
`;

    const result = await model.generateContent(prompt);
    const responseJson = JSON.parse(result.response.text());

    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Hospital finder failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
