
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callOpenAIWithFallback } from '@/lib/openai-client';
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

export async function POST(req: NextRequest) {
  // Fallback quiz to ensure we always return something useful
  const fallbackQuiz = {
    topic: "General Health Awareness",
    microLesson: "Maintaining good health involves making informed choices about diet, exercise, and lifestyle. Regular monitoring of key health metrics like blood sugar, blood pressure, and BMI helps in early detection and prevention of chronic conditions.",
    questions: [
      {
        question: "What is the recommended amount of physical activity per week for adults?",
        options: ["30 minutes total", "75 minutes total", "150 minutes total", "300 minutes total"],
        correctAnswer: "150 minutes total",
        explanation: "Adults should aim for at least 150 minutes of moderate-intensity aerobic activity per week, as recommended by health organizations."
      },
      {
        question: "Which food group should make up the largest portion of your plate?",
        options: ["Proteins", "Vegetables and fruits", "Grains", "Dairy"],
        correctAnswer: "Vegetables and fruits",
        explanation: "Vegetables and fruits should fill half your plate, providing essential vitamins, minerals, and fiber for optimal health."
      },
      {
        question: "What is considered a normal fasting blood sugar level?",
        options: ["Less than 100 mg/dL", "100-125 mg/dL", "126-140 mg/dL", "Above 140 mg/dL"],
        correctAnswer: "Less than 100 mg/dL",
        explanation: "A normal fasting blood sugar level is less than 100 mg/dL. Levels of 100-125 mg/dL indicate prediabetes."
      }
    ]
  };

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

    const response = await callOpenAIWithFallback(
      'openai/gpt-3.5-turbo',
      [
        { role: 'system', content: 'You are an AI assistant that generates educational health quizzes. You always respond with only a valid JSON object as requested.' },
        { role: 'user', content: prompt }
      ],
      {
        temperature: 0.7,
        response_format: { type: "json_object" }
      }
    );

    const responseText = response.choices?.[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response content from OpenRouter');
    }

    const responseJson = JSON.parse(responseText);
    
    // Validate the final JSON against the schema
    const validatedResponse = GenerateQuizOutputSchema.parse(responseJson);

    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    console.error("Quiz generation failed, using fallback quiz:", e);
    return NextResponse.json(fallbackQuiz);
  }
}

