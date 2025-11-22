
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callGeminiWithFallback } from '@/lib/gemini-client';

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



export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateEmergencyAlertInputSchema.parse(body);

    // Fallback emergency alert when AI fails
    const fallbackAlert = {
      subject: "URGENT: Critical Health Reading Detected",
      body: `URGENT MEDICAL ALERT

Dear Emergency Contact,

This is an automated alert from DiaHelper. ${input.patientName} has a critical health reading that requires immediate medical attention.

Critical Reading: ${input.criticalReading}

PLEASE SEEK IMMEDIATE MEDICAL ATTENTION.

If this is a life-threatening emergency, call 911 immediately.

This is an automated message from DiaHelper - please do not reply to this message.

Stay safe,
DiaHelper Health Monitoring System`,
      patientName: input.patientName,
      emergencyContactEmail: input.emergencyContactEmail,
      criticalReading: input.criticalReading
    };

    const prompt = `Generate an URGENT alert message for ${input.patientName}'s emergency contact (${input.emergencyContactEmail}). Respond with only a valid JSON object conforming to the GenerateEmergencyAlertOutput schema.
The critical issue is: ${input.criticalReading}.
The message needs:
1.  An urgent subject line.
2.  A clear body explaining the situation, stating the patient's name and critical reading.
3.  Strongly advise the recipient to contact ${input.patientName} immediately and/or seek emergency medical services.
4.  Mention that this is an automated alert from the DiaHelper application.
5.  Return the input patientName, emergencyContactEmail, and criticalReading in the output for the UI.
`;

    const result = await callGeminiWithFallback(prompt, 'gemini-2.5-flash', 10000);
    const responseJson = JSON.parse(result.replace(/```json\n?/, "").replace(/```$/, ""));

    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({
        subject: "URGENT: Critical Health Reading Detected",
        body: `URGENT MEDICAL ALERT\n\nThis is an automated alert from DiaHelper. Please seek immediate medical attention.\n\nIf this is a life-threatening emergency, call 911 immediately.\n\nStay safe,\nDiaHelper Health Monitoring System`,
        patientName: 'Patient',
        emergencyContactEmail: '',
        criticalReading: 'Critical health reading'
      });
    }
    console.error("Emergency alert generation failed.", e);
    
    // Return fallback emergency alert instead of error
    return NextResponse.json({
      subject: "URGENT: Critical Health Reading Detected",
      body: `URGENT MEDICAL ALERT\n\nThis is an automated alert from DiaHelper. Please seek immediate medical attention.\n\nIf this is a life-threatening emergency, call 911 immediately.\n\nStay safe,\nDiaHelper Health Monitoring System`,
      patientName: 'Patient',
      emergencyContactEmail: '',
      criticalReading: 'Critical health reading'
    });
  }
}

