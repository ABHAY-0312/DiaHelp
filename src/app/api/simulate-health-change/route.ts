
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { healthFormSchema } from '@/lib/types';

export const SimulateHealthChangeInputSchema = z.object({
  currentHealthData: healthFormSchema.describe("The user's complete current health data."),
  changes: z.object({
      physicalActivity: z.enum(['sedentary', 'light', 'moderate', 'active']).optional(),
      dietaryChanges: z.string().optional().describe("A text description of the dietary changes, e.g., 'cut out sugary drinks'."),
      sleepHours: z.number().optional(),
  }).describe("The hypothetical lifestyle changes to simulate."),
});
export type SimulateHealthChangeInput = z.infer<typeof SimulateHealthChangeInputSchema>;


export const SimulateHealthChangeOutputSchema = z.object({
  projectedRiskScore: z.number().describe("The AI's projected new risk score (0-100) after 1 year of the changes."),
  narrative: z.string().describe("A detailed narrative explaining the projected changes to the user's health, including the impact on key metrics like BMI, glucose, and the risk score. It should be encouraging and motivating."),
});
export type SimulateHealthChangeOutput = z.infer<typeof SimulateHealthChangeOutputSchema>;


const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-pro'
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = SimulateHealthChangeInputSchema.parse(body);

    const prompt = `You are a sophisticated health simulation AI named the "Digital Twin Modeler." Your task is to predict the health outcomes of a user after one year based on hypothetical lifestyle changes. Respond with ONLY a valid JSON object that conforms to the following schema:

\`\`\`json
{
  "type": "object",
  "properties": {
    "projectedRiskScore": { "type": "number" },
    "narrative": { "type": "string" }
  },
  "required": ["projectedRiskScore", "narrative"]
}
\`\`\`

Here is the user's current health profile:
- Age: ${input.currentHealthData.age}
- Gender: ${input.currentHealthData.gender}
- BMI: ${input.currentHealthData.bmi}
- Fasting Glucose: ${input.currentHealthData.fastingGlucose}
- HbA1c: ${input.currentHealthData.hba1c}
- Sleep Hours: ${input.currentHealthData.sleepHours}
- Physical Activity: ${input.currentHealthData.physicalActivity}
- Current Risk Score: (You will need to infer this from the data)

The user wants to simulate the following changes for one year:
- New Physical Activity Level: ${input.changes.physicalActivity || 'No change'}
- Dietary Changes: "${input.changes.dietaryChanges || 'No specific changes'}"
- New Average Sleep Hours: ${input.changes.sleepHours !== undefined ? input.changes.sleepHours : 'No change'}

Instructions:
1.  **Analyze the Impact:** Based on established medical knowledge, analyze how the proposed changes would realistically affect the user's key metrics (BMI, glucose, HbA1c, etc.) over one year. For example, increased activity and better diet would likely lower BMI and improve glucose control.
2.  **Project a New Risk Score:** Based on the projected changes to the health metrics, calculate a new estimated diabetes risk score. This score should be a logical evolution from their current state.
3.  **Write a Narrative:** Create a compelling, paragraph-based narrative for the user.
    *   Start by acknowledging the positive changes they are considering.
    *   Explain *how* and *why* their proposed changes would lead to specific health improvements (e.g., "Increasing your activity to a 'moderate' level will help your body use insulin more effectively, which can lead to a lower fasting glucose...").
    *   Clearly state the projected new risk score.
    *   Conclude with an encouraging message that reinforces the power of their choices.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const responseJson = JSON.parse(responseText.replace(/```json\n?/, "").replace(/```$/, ""));

    const validatedResponse = SimulateHealthChangeOutputSchema.parse(responseJson);
    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Digital Twin simulation failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

    