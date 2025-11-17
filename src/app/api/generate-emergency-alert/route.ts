
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

const GenerateEmergencyAlertInputSchema = z.object({
    patientName: z.string().describe("The name of the patient experiencing the emergency."),
    emergencyContactEmail: z.string().describe("The email address of the emergency contact."),
    criticalReading: z.string().describe("The specific critical health reading that triggered the alert (e.g., 'Critically high glucose level (300 mg/dL)')."),
    fullHealthData: z.string().describe("A JSON string of the complete health data submitted by the user."),
});
export type GenerateEmergencyAlertInput = z.infer<typeof GenerateEmergencyAlertInputSchema>;


const GenerateEmergencyAlertOutputSchema = z.object({
  subject: z.string().describe("A short, urgent subject line for the alert email. Should start with 'URGENT:'."),
  body: z.string().describe("The full body of the alert message. It should be clear, concise, and formatted with line breaks for readability. It must include the patient's name, the critical reading, and a strong recommendation to seek immediate medical attention. It should also state that this is an automated alert from DiaHelper."),
  patientName: z.string(),
  emergencyContactEmail: z.string(),
  criticalReading: z.string(),
});
export type GenerateEmergencyAlertOutput = z.infer<typeof GenerateEmergencyAlertOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateEmergencyAlertInputSchema.parse(body);

    const prompt = `Generate an URGENT alert message for ${input.patientName}'s emergency contact (${input.emergencyContactEmail}). Respond with only a valid JSON object conforming to the GenerateEmergencyAlertOutput schema.
The critical issue is: ${input.criticalReading}.
The message needs:
1.  An urgent subject line.
2.  A clear body explaining the situation, stating the patient's name and critical reading.
3.  Strongly advise the recipient to contact ${input.patientName} immediately and/or seek emergency medical services.
4.  Mention that this is an automated alert from the DiaHelper application.
5.  Return the input patientName, emergencyContactEmail, and criticalReading in the output for the UI.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));


    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Emergency alert generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
