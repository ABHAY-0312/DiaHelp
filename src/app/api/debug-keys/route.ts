import { NextResponse } from 'next/server';

export async function GET() {
  const keys = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 15)}...` : 'NOT SET',
    OPENAI_API_KEY_SECONDARY: process.env.OPENAI_API_KEY_SECONDARY ? `${process.env.OPENAI_API_KEY_SECONDARY.substring(0, 15)}...` : 'NOT SET',
    OPENAI_API_KEY_TERTIARY: process.env.OPENAI_API_KEY_TERTIARY ? `${process.env.OPENAI_API_KEY_TERTIARY.substring(0, 15)}...` : 'NOT SET',
  };
  
  console.log('🔍 Environment Variables Debug:', keys);
  
  return NextResponse.json({
    message: 'Check server console for environment variables',
    keys: keys
  });
}