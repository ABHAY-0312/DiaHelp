
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
// Removed Gemini import; using fetch for OpenAI

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

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, reportContext, formData } = ChatInputSchema.parse(body);
    
    const prompt = `You are DiaHelper's digital health assistant. Your role is to answer the user's question based on the provided context.

**Normal Health Ranges for Reference:**
- **BMI**: 18.5 - 24.9
- **Fasting Glucose**: 70 - 100 mg/dL
- **HbA1c**: < 5.7%
- **Waist Circumference**: < 94 cm for males, < 80 cm for females
- **Triglycerides**: < 150 mg/dL
- **HDL Cholesterol**: > 40 mg/dL for males, > 50 mg/dL for females
- **Diastolic Blood Pressure**: < 80 mmHg
- **Sleep Hours**: 7 - 9 hours

**Context: User's Raw Health Data**
---
${JSON.stringify(formData, null, 2)}
---

**User's Question:**
"${question}"

**Instructions:**
1.  **If the user asks to "analyze" their "report"**:
    a.  Your ONLY task is to identify health metrics in the "User's Raw Health Data" that are outside of the "Normal Health Ranges".
    b.  You MUST respond with a list of points, each starting with a '*'. DO NOT use any other list format.
    c.  For each out-of-range metric, format the point like this: "**Problem:** Your value is [User's Value], which is [above/below] the normal range of [Normal Range]. This means [simple explanation]."
    d.  Example: ***High BMI:** Your BMI is 28, which is above the healthy range of 18.5-24.9. This means you are in the overweight category.
    e.  DO NOT add any other explanations, advice, or introductory/concluding sentences. Just the list.
2.  **For any other question**: Answer the user's question directly based on general health knowledge or the data provided, in a friendly and conversational tone. If you need to create a list, use a '*' for each bullet point.
`;

    const openrouterRes = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        // Optionally add these:
        // 'HTTP-Referer': 'https://your-site-url.com',
        // 'X-Title': 'DiaHelp',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: "You are DiaHelper's digital health assistant. Your role is to answer the user's question based on the provided context.\n\nNormal Health Ranges for Reference:\n- BMI: 18.5 - 24.9\n- Fasting Glucose: 70 - 100 mg/dL\n- HbA1c: < 5.7%\n- Waist Circumference: < 94 cm for males, < 80 cm for females\n- Triglycerides: < 150 mg/dL\n- HDL Cholesterol: > 40 mg/dL for males, > 50 mg/dL for females\n- Diastolic Blood Pressure: < 80 mmHg\n- Sleep Hours: 7 - 9 hours\n\nContext: User's Raw Health Data\n---\n" + JSON.stringify(formData, null, 2) + "\n---\n" },
          { role: 'user', content: question },
        ],
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!openrouterRes.ok) {
      const error = await openrouterRes.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await openrouterRes.json();
    const responseText = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    const responseJson = { answer: responseText };

    return NextResponse.json(responseJson);
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: e.errors }, { status: 400 });
    }
    if (e.message && (e.message.includes('safety') || e.message.includes('blocked'))) {
      return NextResponse.json({ error: 'Inappropriate content detected', message: 'Your message was blocked due to safety settings. Please rephrase.' }, { status: 400 });
    }
    console.error("Chatbot failed.", e);
    return NextResponse.json({ error: 'Internal Server Error', message: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
