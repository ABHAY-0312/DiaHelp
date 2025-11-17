
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
} from '@google/generative-ai';

const GenerateQuizInputSchema = z.object({
  topic: z.string().describe('The health topic for the quiz (e.g., "Carbohydrates", "Blood Sugar", "BMI").'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const QuizQuestionSchema = z.object({
    question: z.string().describe("The quiz question."),
    options: z.array(z.string()).describe("An array of 4 possible answers."),
    correctAnswer: z.string().describe("The correct answer from the options array."),
    explanation: z.string().describe("A brief explanation of why the correct answer is right.")
});

const GenerateQuizOutputSchema = z.object({
  topic: z.string().describe("The topic of the quiz."),
  microLesson: z.string().describe("A brief, easy-to-understand educational paragraph about the topic."),
  questions: z.array(QuizQuestionSchema).describe("An array of 3-5 quiz questions."),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateQuizInputSchema.parse(body);

    const prompt = `Create a simple educational module about "${input.topic}". Respond with only a valid JSON object conforming to the GenerateQuizOutput schema.
The module must contain:
1.  **Micro-Lesson**: A short, simple paragraph (3-4 sentences) explaining the topic.
2.  **Quiz**: 3 multiple-choice questions. For each question, provide the question text, an array of 4 options, the correct answer, and a one-sentence explanation.
The goal is to be educational and encouraging.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));


    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Quiz generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
