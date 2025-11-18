
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
// import {
//   GoogleGenerativeAI,
// } from '@google/generative-ai';

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

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = GenerateQuizInputSchema.parse(body);

    const prompt = `Create a simple educational module about "${input.topic}". You must respond with only a valid JSON object that conforms to the following TypeScript type:
\`\`\`typescript
type GenerateQuizOutput = {
  topic: string; // The topic of the quiz.
  microLesson: string; // A brief, easy-to-understand educational paragraph about the topic.
  questions: {
    question: string; // The quiz question.
    options: string[]; // An array of 4 possible answers.
    correctAnswer: string; // The correct answer from the options array.
    explanation: string; // A brief explanation of why the correct answer is right.
  }[]; // An array of 3-5 quiz questions.
}
\`\`\`
The module must contain:
1.  **Micro-Lesson**: A short, simple paragraph (3-4 sentences) explaining the topic.
2.  **Quiz**: 3 multiple-choice questions.
The goal is to be educational and encouraging. Do not include any markdown formatting like \`\`\`json or any other text outside of the JSON object.`;

    const openrouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo', // Using a faster model for quiz generation
        messages: [
          { role: 'system', content: 'You are an AI assistant that generates educational health quizzes. You always respond with only a valid JSON object as requested.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: "json_object" }, // Request JSON output
        temperature: 0.7,
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
    
    // Validate the final JSON against the schema
    const validatedResponse = GenerateQuizOutputSchema.parse(responseJson);

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Quiz generation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

