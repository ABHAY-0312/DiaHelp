
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
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
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        microLesson: { type: 'string' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              correctAnswer: { type: 'string' },
              explanation: { type: 'string' },
            },
            required: ['question', 'options', 'correctAnswer', 'explanation'],
          },
        },
      },
      required: ['topic', 'microLesson', 'questions'],
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateQuizInputSchema.parse(body);

    const prompt = `You are a health educator AI. Your task is to create a simple and engaging educational module about the topic of ${input.topic}.

The module must contain two parts:
1.  **Micro-Lesson**: A short, single paragraph (3-4 sentences) that explains the core concepts of the topic in simple, clear language.
2.  **Quiz**: A set of 3 multiple-choice questions to test the user's understanding.

For each question, you must provide:
- The question itself.
- An array of exactly 4 answer options. One must be correct.
- The correct answer.
- A one-sentence explanation for why the answer is correct.

The goal is to be educational and encouraging, not overly clinical or difficult.
`;

    const result = await model.generateContent(prompt);
    const responseJson = JSON.parse(result.response.text());

    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Quiz generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
