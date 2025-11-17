
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
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
  model: 'gemini-2.5-flash'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { location } = FindHospitalsInputSchema.parse(body);

    const prompt = `Find 3-5 major hospitals in or near "${location}". Respond with only a valid JSON object conforming to the FindHospitalsOutput schema.
For each hospital, provide its name, address, and main phone number.
Include the following disclaimer: "Please verify all details with the hospital directly before visiting."
If no reliable information is found, return an empty list but still include the disclaimer.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));


    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Hospital finder failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

