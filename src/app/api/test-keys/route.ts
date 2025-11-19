import { NextRequest, NextResponse } from 'next/server';
import { getGeminiKeyStats, callGeminiWithFallback } from '@/lib/gemini-client';

export async function GET(req: NextRequest) {
  try {
    const stats = getGeminiKeyStats();
    
    console.log('🔍 Key Stats:', stats);
    
    // Test a simple prompt to see which key gets used
    try {
      const result = await callGeminiWithFallback("Say 'test successful'", 'gemini-2.5-flash', 5000);
      const response = result.response.text();
      
      return NextResponse.json({
        success: true,
        keyStats: stats,
        testResult: response,
        message: "Key rotation test completed"
      });
      
    } catch (testError: any) {
      return NextResponse.json({
        success: false,
        keyStats: stats,
        error: testError.message,
        message: "Test call failed"
      });
    }
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: "Failed to get key stats"
    }, { status: 500 });
  }
}