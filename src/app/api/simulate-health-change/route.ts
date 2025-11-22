import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callOpenAIWithFallback } from '@/lib/openai-client';
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

export async function POST(req: NextRequest) {
  // Fallback simulation result when AI fails
  const fallbackSimulation = {
    projectedRiskScore: 45,
    narrative: "We're experiencing technical difficulties with our health simulation service. However, positive lifestyle changes like regular exercise, healthy eating, and adequate sleep generally lead to improved health outcomes. Consult with your healthcare provider for personalized guidance on managing your diabetes risk."
  };

  try {
    const body = await req.json();
    const input = SimulateHealthChangeInputSchema.parse(body);

    const prompt = `Predict the health outcomes of a user after one year based on hypothetical lifestyle changes. You must respond with only a valid JSON object that conforms to the SimulateHealthChangeOutput schema.
Current Health Profile:
- Age: ${input.currentHealthData.age}, Gender: ${input.currentHealthData.gender}, BMI: ${input.currentHealthData.bmi}, Glucose: ${input.currentHealthData.fastingGlucose}, HbA1c: ${input.currentHealthData.hba1c}, Sleep: ${input.currentHealthData.sleepHours}, Activity: ${input.currentHealthData.physicalActivity}

Simulated Changes for One Year:
- Activity Level: ${input.changes.physicalActivity || 'No change'}
- Diet: "${input.changes.dietaryChanges || 'No specific changes'}"
- Sleep: ${input.changes.sleepHours !== undefined ? input.changes.sleepHours : 'No change'}

Instructions:
1.  **Analyze Impact**: Based on medical knowledge, analyze how these changes would affect key metrics (BMI, glucose, etc.) over one year.
2.  **Project Risk Score**: Calculate a new estimated diabetes risk score based on the projected metrics.
3.  **Write Narrative**: Create a compelling narrative explaining the projection. Start by acknowledging the positive changes, explain the "how" and "why" of the improvements, state the new risk score, and conclude with an encouraging message.
Do not include any markdown formatting or other text outside the JSON object.`;

    const response = await callOpenAIWithFallback(
      'openai/gpt-3.5-turbo',
      [
        { role: 'system', content: 'You are a health simulation AI that predicts future health outcomes based on lifestyle changes. You always respond with only a valid JSON object as requested.' },
        { role: 'user', content: prompt }
      ],
      {
        temperature: 0.7,
        response_format: { type: "json_object" }
      }
    );

    const responseText = response.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error('No response content from OpenAI');
    }

    const responseJson = JSON.parse(responseText);
    const validatedResponse = SimulateHealthChangeOutputSchema.parse(responseJson);
    
    return NextResponse.json(validatedResponse);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json(fallbackSimulation);
    }
    console.error("Digital Twin simulation failed.", e);
    
    // Return fallback simulation instead of error
    return NextResponse.json(fallbackSimulation);
  }
}

