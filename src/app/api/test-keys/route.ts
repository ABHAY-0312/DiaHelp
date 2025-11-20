import { NextRequest, NextResponse } from 'next/server';
import { getGeminiKeyStats, callGeminiWithFallback } from '@/lib/gemini-client';

export async function GET(req: NextRequest) {
  try {
    const stats = getGeminiKeyStats();
    
    console.log('🔍 Key Stats:', stats);
    console.log(`🔑 Available keys: ${stats.totalKeys}`);
    
    // Test multiple calls to verify key rotation
    const testResults = [];
    
    for (let i = 0; i < 3; i++) {
      console.log(`\n🧪 === TEST ${i + 1}/3 ===`);
      
      try {
        const result = await callGeminiWithFallback(
          `Test ${i + 1}: Reply with exactly "Key test ${i + 1} successful"`, 
          'gemini-2.5-flash', 
          8000
        );
        const response = result.response.text();
        
        testResults.push({
          test: i + 1,
          success: true,
          response: response,
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Test ${i + 1} completed successfully`);
        
      } catch (testError: any) {
        console.error(`❌ Test ${i + 1} failed:`, testError.message);
        testResults.push({
          test: i + 1,
          success: false,
          error: testError.message,
          timestamp: new Date().toISOString()
        });
      }
      
      // Small delay between tests
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return NextResponse.json({
      success: true,
      keyStats: stats,
      testResults: testResults,
      summary: {
        totalTests: testResults.length,
        successfulTests: testResults.filter(t => t.success).length,
        failedTests: testResults.filter(t => !t.success).length
      },
      message: "Key rotation verification completed",
      instructions: "Check the console logs to see which specific keys were used for each test"
    });
    
  } catch (error: any) {
    console.error('❌ Test endpoint failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: "Failed to run key rotation test"
    }, { status: 500 });
  }
}