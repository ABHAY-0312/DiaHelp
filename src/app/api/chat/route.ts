
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

const ChatInputSchema = z.object({
  question: z.string(),
  reportContext: z.string(),
  formData: z.record(z.any()).optional(),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  answer: z.string(),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ]
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, reportContext, formData } = ChatInputSchema.parse(body);
    
    let prompt: string;
    
    if (question === 'INITIAL_ANALYSIS') {
      prompt = `You are DiaHelper's digital health assistant. A new health report has just been generated for the user.
Provide a brief, encouraging, and insightful summary of their results as the opening message.
Start by greeting the user. Mention their risk score and what it means (e.g., "which is in the low/medium/high range").
Briefly touch on one or two of the key risk factors from their data.
End by inviting the user to ask any questions they have about their report or health in general.

Report Summary:
---
${reportContext}
---

User's Health Data:
---
${JSON.stringify(formData, null, 2)}
---
`;
    } else {
      prompt = `You are DiaHelper's digital health assistant. Use the provided Report Context and the user's Health Data as the primary sources to answer the user's question.
If the user asks for a general health term definition (e.g., "What is BMI?"), provide a clear, direct answer. Maintain a direct, empowering, and encouraging tone. Avoid clinical jargon.

Report Context:
---
${reportContext}
---

User's Health Data:
---
${JSON.stringify(formData, null, 2)}
---

User's Question:
---
${question}
---
`;
    }


    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // The response is expected to be a JSON object string.
    // However, if the model fails to provide one, we wrap its response.
    let responseJson;
    try {
        responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));
    } catch (e) {
        responseJson = { answer: responseText };
    }


    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
     // Handle safety-related blocks from the model
    if (e.message && (e.message.includes('safety') || e.message.includes('blocked'))) {
      return NextResponse.json({ error: 'Inappropriate content detected', message: 'Your message was blocked due to safety settings. Please rephrase.' }, { status: 400 });
    }
    console.error("Chatbot failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
