import { NextRequest, NextResponse } from 'next/server';

// Simple test endpoint that always returns a working timeline
export async function GET() {
  const testTimeline = {
    timeline: [
      {
        timeframe: "In 1-2 Years",
        prediction: "Test prediction for short term - your health markers may show gradual changes.",
        suggestion: "Start with small daily walks and reduce sugary drinks for immediate benefits."
      },
      {
        timeframe: "In 5 Years", 
        prediction: "Test prediction for medium term - consistent habits will significantly impact your health trajectory.",
        suggestion: "Develop a regular exercise routine and work with healthcare providers for comprehensive care."
      },
      {
        timeframe: "In 10+ Years",
        prediction: "Test prediction for long term - lifestyle choices made today will determine your health outcomes.",
        suggestion: "Focus on preventive care and regular health screenings to catch issues early."
      }
    ]
  };
  
  return NextResponse.json(testTimeline);
}

export async function POST() {
  // Same response for POST requests
  return GET();
}