import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithFallback } from '@/lib/gemini-client';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Starting failover test - using an invalid model to force failures...');
    
    // Test with an invalid model that should fail and trigger model fallback
    try {
      const result = await callGeminiWithFallback(
        "This should test the failover system", 
        'gemini-invalid-model', // This will fail and should trigger fallback
        5000
      );
      const response = result.response.text();
      
      return NextResponse.json({
        success: true,
        message: "Unexpected success - failover test did not trigger as expected",
        result: response
      });
      
    } catch (error: any) {
      console.log('✅ Expected failure occurred, testing actual model degradation...');
      
      // Now test with a valid model that might be overloaded to test key rotation
      try {
        const result = await callGeminiWithFallback(
          "Test key rotation with valid model", 
          'gemini-2.5-pro', // Start with pro, should fallback to flash if needed
          8000
        );
        const response = result.response.text();
        
        return NextResponse.json({
          success: true,
          message: "Failover test completed - system successfully handled failures and found working key/model",
          result: response,
          notes: "Check console logs to see the exact failover sequence"
        });
        
      } catch (finalError: any) {
        return NextResponse.json({
          success: false,
          message: "Complete failover test - all keys and models failed",
          error: finalError.message,
          notes: "This indicates either all API keys are exhausted or there's a systemic issue"
        });
      }
    }
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: "Failover test endpoint failed"
    }, { status: 500 });
  }
}