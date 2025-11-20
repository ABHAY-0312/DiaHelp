# Simple API Key Tester for DiaHelp
Write-Host "🔍 DiaHelp API Key Testing Script" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (Test-Path ".env.local") {
    Write-Host "✅ Found .env.local file" -ForegroundColor Green
} else {
    Write-Host "❌ .env.local file not found!" -ForegroundColor Red
    Write-Host "Please create .env.local with your API keys" -ForegroundColor Yellow
    exit 1
}

# Simple function to test a Gemini API key
function Test-GeminiAPI {
    param($apiKey, $keyNumber)
    
    Write-Host "🧪 Testing Gemini Key $keyNumber..." -ForegroundColor Yellow
    
    $body = @"
{
  "contents": [{
    "parts": [{"text": "Say hello"}]
  }]
}
"@
    
    try {
        $response = Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" -Method POST -Body $body -Headers @{
            "x-goog-api-key" = $apiKey
            "Content-Type" = "application/json"
        } -TimeoutSec 10
        
        Write-Host "✅ Gemini Key $keyNumber: SUCCESS" -ForegroundColor Green
        Write-Host "   Response: $($response.candidates[0].content.parts[0].text)" -ForegroundColor White
        return $true
    }
    catch {
        Write-Host "❌ Gemini Key $keyNumber: FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Simple function to test an OpenAI API key
function Test-OpenAIAPI {
    param($apiKey, $keyNumber)
    
    Write-Host "🧪 Testing OpenAI Key $keyNumber..." -ForegroundColor Yellow
    
    $body = @"
{
  "model": "gpt-4o-mini",
  "messages": [{"role": "user", "content": "Say hello"}],
  "max_tokens": 10
}
"@
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.openai.com/v1/chat/completions" -Method POST -Body $body -Headers @{
            "Authorization" = "Bearer $apiKey"
            "Content-Type" = "application/json"
        } -TimeoutSec 10
        
        Write-Host "✅ OpenAI Key $keyNumber: SUCCESS" -ForegroundColor Green
        Write-Host "   Response: $($response.choices[0].message.content)" -ForegroundColor White
        return $true
    }
    catch {
        Write-Host "❌ OpenAI Key $keyNumber: FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "🚀 Starting API Tests..." -ForegroundColor Magenta
Write-Host ""

# Test with hardcoded example keys (you'll need to manually add your keys here)
$geminiKey1 = "YOUR_GEMINI_KEY_1_HERE"
$geminiKey2 = "YOUR_GEMINI_KEY_2_HERE"
$geminiKey3 = "YOUR_GEMINI_KEY_3_HERE"

$openaiKey1 = "YOUR_OPENAI_KEY_1_HERE"
$openaiKey2 = "YOUR_OPENAI_KEY_2_HERE"
$openaiKey3 = "YOUR_OPENAI_KEY_3_HERE"

Write-Host "⚠️  MANUAL SETUP REQUIRED:" -ForegroundColor Yellow
Write-Host "Please edit test-simple.ps1 and replace 'YOUR_KEY_HERE' with your actual API keys" -ForegroundColor Yellow
Write-Host "Or run the following commands in PowerShell to set environment variables:" -ForegroundColor Yellow
Write-Host ""
Write-Host '$env:GEMINI_API_KEY = "your_actual_key_1"' -ForegroundColor Cyan
Write-Host '$env:GEMINI_API_KEY_2 = "your_actual_key_2"' -ForegroundColor Cyan
Write-Host '$env:GEMINI_API_KEY_3 = "your_actual_key_3"' -ForegroundColor Cyan
Write-Host '$env:OPENAI_API_KEY = "your_actual_openai_key_1"' -ForegroundColor Cyan
Write-Host '$env:OPENAI_API_KEY_2 = "your_actual_openai_key_2"' -ForegroundColor Cyan
Write-Host '$env:OPENAI_API_KEY_3 = "your_actual_openai_key_3"' -ForegroundColor Cyan
Write-Host ""
Write-Host "Then you can test them like this:" -ForegroundColor Yellow
Write-Host 'Test-GeminiAPI -apiKey $env:GEMINI_API_KEY -keyNumber 1' -ForegroundColor Cyan
Write-Host 'Test-OpenAIAPI -apiKey $env:OPENAI_API_KEY -keyNumber 1' -ForegroundColor Cyan