import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithFallback } from '@/lib/gemini-client';
import { callOpenAIWithFallback } from '@/lib/openai-client';

export async function POST(req: NextRequest) {
  try {
    const { testType = 'both' } = await req.json().catch(() => ({}));
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };
    
    // Test Gemini key rotation
    if (testType === 'both' || testType === 'gemini') {
      console.log('🧪 Testing Gemini key rotation...');
      
      try {
        const geminiResult = await callGeminiWithFallback(
          'Respond with just the word "success" and nothing else.',
          'gemini-2.5-flash',
          5000
        );
        
        results.tests.push({
          provider: 'Gemini',
          status: 'success',
          response: geminiResult.response.text(),
          message: 'Gemini API rotation working'
        });
        
      } catch (geminiError: any) {
        results.tests.push({
          provider: 'Gemini',
          status: 'failed',
          error: geminiError.message,
          message: 'Gemini API rotation failed'
        });
      }
    }
    
    // Test OpenAI key rotation
    if (testType === 'both' || testType === 'openai') {
      console.log('🧪 Testing OpenAI key rotation...');
      
      try {
        const openaiResult = await callOpenAIWithFallback(
          'openai/gpt-3.5-turbo',
          [{ role: 'user', content: 'Respond with just the word "success" and nothing else.' }],
          { timeout: 5000 }
        );
        
        results.tests.push({
          provider: 'OpenAI',
          status: 'success',
          response: openaiResult.choices[0].message.content,
          message: 'OpenAI API rotation working'
        });
        
      } catch (openaiError: any) {
        results.tests.push({
          provider: 'OpenAI',
          status: 'failed',
          error: openaiError.message,
          message: 'OpenAI API rotation failed'
        });
      }
    }
    
    // Multiple rapid calls to test key distribution
    if (testType === 'stress') {
      console.log('🧪 Testing key distribution under load...');
      
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(
          callGeminiWithFallback(
            `Test call ${i + 1}: Respond with "Call ${i + 1} successful"`,
            'gemini-2.5-flash',
            3000
          ).catch((error: any) => ({ error: error.message, callIndex: i + 1 }))
        );
      }
      
      const stressResults = await Promise.allSettled(promises);
      results.tests.push({
        provider: 'Gemini Stress Test',
        status: 'completed',
        results: stressResults.map((result, i) => ({
          callIndex: i + 1,
          status: result.status,
          data: result.status === 'fulfilled' ? result.value : result.reason
        })),
        message: 'Stress test completed - check logs for key distribution'
      });
    }
    
    const summary = {
      totalTests: results.tests.length,
      successfulTests: results.tests.filter((t: any) => t.status === 'success').length,
      failedTests: results.tests.filter((t: any) => t.status === 'failed').length
    };
    
    return NextResponse.json({
      success: true,
      summary,
      results,
      message: 'Key rotation test completed - check console logs for detailed key usage'
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: "Key rotation test failed"
    }, { status: 500 });
  }
}