
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callGeminiWithFallback } from '@/lib/gemini-client';

const GenerateMetabolicAgeInputSchema = z.object({
  actualAge: z.number().describe('The chronological age of the user.'),
  bmi: z.number().describe('The BMI (Body Mass Index) of the user.'),
  glucose: z.number().describe('The plasma glucose concentration of the user.'),
  sleepHours: z.number().describe('The average hours of sleep per night for the user.'),
  fitnessLevel: z
    .enum(['sedentary', 'light', 'moderate', 'active'])
    .describe('The self-reported fitness level of the user.'),
});
export type GenerateMetabolicAgeInput = z.infer<
  typeof GenerateMetabolicAgeInputSchema
>;

const GenerateMetabolicAgeOutputSchema = z.object({
  metabolicAge: z
    .number()
    .describe(
      "The calculated metabolic age. This should be a realistic integer based on the provided data."
    ),
  explanation: z
    .string()
    .describe(
      "A brief, one or two-sentence explanation of the result, comparing it to the actual age and highlighting the key contributing factors in a positive and encouraging tone."
    ),
});
export type GenerateMetabolicAgeOutput = z.infer<
  typeof GenerateMetabolicAgeOutputSchema
>;

export async function POST(req: NextRequest) {
  // Fallback metabolic age calculation to ensure we always return something useful
  const generateFallbackMetabolicAge = (input: GenerateMetabolicAgeInput) => {
    let metabolicAge = input.actualAge;
    
    // Adjust based on BMI
    if (input.bmi < 18.5) metabolicAge += 2; // Underweight
    else if (input.bmi > 30) metabolicAge += 6; // Obese
    else if (input.bmi > 25) metabolicAge += 3; // Overweight
    else metabolicAge -= 1; // Healthy weight
    
    // Adjust based on glucose
    if (input.glucose > 126) metabolicAge += 8; // Diabetic range
    else if (input.glucose > 100) metabolicAge += 4; // Pre-diabetic
    else metabolicAge -= 1; // Healthy range
    
    // Adjust based on sleep
    if (input.sleepHours < 6) metabolicAge += 3; // Poor sleep
    else if (input.sleepHours > 9) metabolicAge += 1; // Too much sleep
    else metabolicAge -= 1; // Good sleep
    
    // Adjust based on fitness level
    switch (input.fitnessLevel) {
      case 'sedentary': metabolicAge += 4; break;
      case 'light': metabolicAge += 1; break;
      case 'moderate': metabolicAge -= 2; break;
      case 'active': metabolicAge -= 4; break;
    }
    
    // Ensure reasonable bounds
    metabolicAge = Math.max(20, Math.min(100, Math.round(metabolicAge)));
    
    const ageDiff = metabolicAge - input.actualAge;
    let explanation;
    if (ageDiff <= -3) {
      explanation = `Great news! Your metabolic age is ${Math.abs(ageDiff)} years younger than your actual age, reflecting your healthy lifestyle choices.`;
    } else if (ageDiff <= 0) {
      explanation = `Your metabolic age matches your chronological age, indicating a good balance of health factors.`;
    } else if (ageDiff <= 5) {
      explanation = `Your metabolic age is ${ageDiff} years higher than your actual age. Small improvements in diet and exercise can help lower it.`;
    } else {
      explanation = `Your metabolic age is ${ageDiff} years higher than your actual age. Focus on regular exercise, better sleep, and glucose management to improve it.`;
    }
    
    return { metabolicAge, explanation };
  };

  try {
    const body = await req.json();
    const input = GenerateMetabolicAgeInputSchema.parse(body);

    const prompt = `Estimate a user's metabolic age based on their health data. Metabolic age compares Basal Metabolic Rate (BMR) to the average for their age group. A lower metabolic age is better.

User Data:
- Chronological Age: ${input.actualAge}
- BMI: ${input.bmi} (Healthy: 18.5-24.9)
- Glucose: ${input.glucose} mg/dL (Healthy: 70-100)
- Sleep: ${input.sleepHours} hours (Optimal: 7-9)
- Fitness Level: ${input.fitnessLevel}

You must respond with ONLY a valid JSON object in this exact format:
{
  "metabolicAge": 35,
  "explanation": "Brief encouraging explanation comparing to actual age"
}

Instructions:
1. Calculate a realistic metabolic age as an integer. High BMI/glucose increases it; good sleep/fitness decreases it.
2. Provide a brief, encouraging explanation focusing on positive actions.`;

    // Add timeout for Gemini API
    try {
      const result = await callGeminiWithFallback(prompt, 'gemini-2.5-pro', 15000);
      const responseText = result.response.text();
      
      if (!responseText || responseText.trim().length === 0) {
        console.warn("Empty response from Gemini, using fallback calculation");
        return NextResponse.json(generateFallbackMetabolicAge(input));
      }

      // Clean up the response text
      let cleanedText = responseText.trim();
      cleanedText = cleanedText.replace(/```json\n?/g, "");
      cleanedText = cleanedText.replace(/```\n?/g, "");
      
      let responseJson;
      try {
        responseJson = JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn("Failed to parse Gemini response, using fallback calculation:", parseError);
        return NextResponse.json(generateFallbackMetabolicAge(input));
      }

      // Use safe validation
      const validationResult = GenerateMetabolicAgeOutputSchema.safeParse(responseJson);
      if (!validationResult.success) {
        console.warn("Metabolic age validation failed, using fallback calculation:", validationResult.error);
        return NextResponse.json(generateFallbackMetabolicAge(input));
      }

      return NextResponse.json(validationResult.data);
    } catch (geminiError: any) {
      console.warn("Gemini API failed, using fallback calculation:", geminiError.message);
      return NextResponse.json(generateFallbackMetabolicAge(input));
    }

  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    console.error("Metabolic age generation failed completely:", e);
    
    // Even if input parsing failed, try to provide a generic fallback
    const genericFallback = {
      metabolicAge: 35,
      explanation: "Unable to calculate precise metabolic age due to technical issues. Please try again or consult with a healthcare provider for personalized assessment."
    };
    
    return NextResponse.json(genericFallback);
  }
}

