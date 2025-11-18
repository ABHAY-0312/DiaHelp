
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // ALWAYS return a valid health tip - no validation that can fail
  const healthTips = [
    "Stay hydrated by drinking at least 8 glasses of water daily to support your metabolism and overall health.",
    "Take a 10-minute walk after meals to help regulate blood sugar levels naturally.",
    "Choose whole grains over refined carbs to maintain steady energy throughout the day.",
    "Include fiber-rich foods like vegetables and legumes in your meals to support digestive health.",
    "Practice deep breathing for 5 minutes daily to help manage stress and support overall wellness."
  ];
  
  // Randomly select a tip to provide variety
  const randomTip = healthTips[Math.floor(Math.random() * healthTips.length)];
  
  // Always return the exact same structure expected
  const response = {
    tip: randomTip
  };
  
  return NextResponse.json(response);
}

