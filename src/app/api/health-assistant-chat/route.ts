
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { callOpenAIWithFallback } from '@/lib/openai-client';

const HealthAssistantChatInputSchema = z.object({
  question: z.string().describe("The user's question about health or diabetes."),
});
export type HealthAssistantChatInput = z.infer<
  typeof HealthAssistantChatInputSchema
>;

const HealthAssistantChatOutputSchema = z.object({
  answer: z
    .string()
    .describe('The helpful, educational answer to the user question.'),
});
export type HealthAssistantChatOutput = z.infer<
  typeof HealthAssistantChatOutputSchema
>;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = HealthAssistantChatInputSchema.parse(body);

    console.log('💬 Health assistant question:', input.question);

    try {
      const response = await callOpenAIWithFallback(
        "openai/gpt-3.5-turbo", // Use cheaper model
        [
          { role: 'system', content: 'You are an expert, friendly, and knowledgeable digital health assistant for DiaHelper. FORMATTING RULES: Use **double asterisks** for bold text like **BMI**, **Blood Sugar**. For lists, use dashes (-) NOT asterisks (*). Example: "- First point" not "* First point". Always make key health terms bold with **term**.' },
          { role: 'user', content: input.question },
        ],
        {
          temperature: 0.7,
          timeout: 15000,
          max_tokens: 512 // Limit response to save credits
        }
      );

      console.log("OpenAI health assistant response:", response);

      const responseContent = response?.choices?.[0]?.message?.content;
      
      if (!responseContent) {
        throw new Error('No response content from OpenAI');
      }

      const validatedResponse: HealthAssistantChatOutput = {
        answer: responseContent,
      };

      return NextResponse.json(validatedResponse);
    } catch (error: any) {
      console.error('Health assistant error:', error);
      const validatedResponse: HealthAssistantChatOutput = {
        answer: "I'm having trouble right now. Please try asking your question again, or consult with a healthcare professional for personalized advice."
      };
      return NextResponse.json(validatedResponse);
    }
  } catch (e: any) {
    if (e instanceof ZodError) {
      console.error('Health assistant validation error:', e);
      const fallbackResponse: HealthAssistantChatOutput = {
        answer: "I'm having trouble understanding your question. Please try rephrasing it, or consult with a healthcare professional for personalized advice."
      };
      return NextResponse.json(fallbackResponse);
    }
    console.error("Health assistant chat failed.", e);
    const fallbackResponse: HealthAssistantChatOutput = {
      answer: "I'm experiencing technical difficulties. Please try again later, or consult with a healthcare professional for immediate assistance."
    };
    return NextResponse.json(fallbackResponse);
  }
}

