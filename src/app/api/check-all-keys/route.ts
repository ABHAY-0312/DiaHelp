import { NextRequest, NextResponse } from 'next/server';
import { getGeminiKeyStats } from '@/lib/gemini-client';
import { getOpenAIKeyStats } from '@/lib/openai-client';

export async function GET(req: NextRequest) {
  try {
    const geminiStats = getGeminiKeyStats();
    const openaiStats = getOpenAIKeyStats();
    
    console.log('🔍 Gemini Key Stats:', geminiStats);
    console.log('🔍 OpenAI Key Stats:', openaiStats);
    
    return NextResponse.json({
      success: true,
      gemini: {
        stats: geminiStats,
        status: geminiStats.hasAllKeys ? 'All 3 keys configured' : `Only ${geminiStats.totalKeys} keys configured`,
      },
      openai: {
        stats: openaiStats,
        status: openaiStats.hasAllKeys ? 'All 3 keys configured' : `Only ${openaiStats.totalKeys} keys configured`,
      },
      overall: {
        totalAPIKeys: geminiStats.totalKeys + openaiStats.totalKeys,
        recommendation: geminiStats.hasAllKeys && openaiStats.hasAllKeys 
          ? 'All API keys configured - excellent redundancy!' 
          : 'Consider adding missing API keys for better reliability'
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: "Failed to get API key statistics"
    }, { status: 500 });
  }
}