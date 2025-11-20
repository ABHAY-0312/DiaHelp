# API Key Testing Script for DiaHelp
# Tests all Gemini and OpenAI API keys rotationally

Write-Host "🔍 API Key Testing Script" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
    Write-Host "✅ Loaded .env.local file" -ForegroundColor Green
} else {
    Write-Host "❌ .env.local file not found" -ForegroundColor Red
    exit 1
}

# Get API keys from environment
$geminiKeys = @(
    $env:GEMINI_API_KEY,
    $env:GEMINI_API_KEY_2,
    $env:GEMINI_API_KEY_3
) | Where-Object { $_ -ne $null -and $_ -ne "" }

$openaiKeys = @(
    $env:OPENAI_API_KEY,
    $env:OPENAI_API_KEY_2,
    $env:OPENAI_API_KEY_3
) | Where-Object { $_ -ne $null -and $_ -ne "" }

Write-Host "📊 Found $($geminiKeys.Count) Gemini keys and $($openaiKeys.Count) OpenAI keys" -ForegroundColor Blue
Write-Host ""

# Test Gemini API Key
function Test-GeminiKey {
    param($apiKey, $index)
    
    $keyDisplay = $apiKey.Substring(0, [Math]::Min(10, $apiKey.Length)) + "..."
    Write-Host "🧪 Testing Gemini Key $($index + 1): $keyDisplay" -ForegroundColor Yellow
    
    $body = @{
        contents = @(
            @{
                parts = @(
                    @{
                        text = "Say 'test successful' in exactly 2 words"
                    }
                )
            }
        )
    } | ConvertTo-Json -Depth 3
    
    $headers = @{
        "x-goog-api-key" = $apiKey
        "Content-Type" = "application/json"
    }
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        $response = Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" -Method POST -Body $body -Headers $headers -TimeoutSec 15
        
        $stopwatch.Stop()
        $responseTime = $stopwatch.ElapsedMilliseconds
        
        $responseText = $response.candidates[0].content.parts[0].text.Trim()
        
        Write-Host "✅ Gemini Key $($index + 1) SUCCESS ($($responseTime)ms)" -ForegroundColor Green
        Write-Host "   Response: `"$responseText`"" -ForegroundColor White
        Write-Host ""
        
        return @{
            success = $true
            responseTime = $responseTime
            response = $responseText
            error = $null
        }
    }
    catch {
        Write-Host "❌ Gemini Key $($index + 1) FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor White
        Write-Host ""
        
        return @{
            success = $false
            responseTime = $null
            response = $null
            error = $_.Exception.Message
        }
    }
}

# Test OpenAI API Key
function Test-OpenAIKey {
    param($apiKey, $index)
    
    $keyDisplay = $apiKey.Substring(0, [Math]::Min(10, $apiKey.Length)) + "..."
    Write-Host "🧪 Testing OpenAI Key $($index + 1): $keyDisplay" -ForegroundColor Yellow
    
    $body = @{
        model = "gpt-4o-mini"
        messages = @(
            @{
                role = "user"
                content = "Say 'test successful' in exactly 2 words"
            }
        )
        max_tokens = 10
        temperature = 0
    } | ConvertTo-Json -Depth 3
    
    $headers = @{
        "Authorization" = "Bearer $apiKey"
        "Content-Type" = "application/json"
    }
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        $response = Invoke-RestMethod -Uri "https://api.openai.com/v1/chat/completions" -Method POST -Body $body -Headers $headers -TimeoutSec 15
        
        $stopwatch.Stop()
        $responseTime = $stopwatch.ElapsedMilliseconds
        
        $responseText = $response.choices[0].message.content.Trim()
        
        Write-Host "✅ OpenAI Key $($index + 1) SUCCESS ($($responseTime)ms)" -ForegroundColor Green
        Write-Host "   Response: `"$responseText`"" -ForegroundColor White
        Write-Host ""
        
        return @{
            success = $true
            responseTime = $responseTime
            response = $responseText
            error = $null
        }
    }
    catch {
        Write-Host "❌ OpenAI Key $($index + 1) FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor White
        Write-Host ""
        
        return @{
            success = $false
            responseTime = $null
            response = $null
            error = $_.Exception.Message
        }
    }
}

# Main testing function
$geminiResults = @()
$openaiResults = @()

Write-Host "🚀 Starting Gemini API Key Tests..." -ForegroundColor Magenta
Write-Host ""

# Test all Gemini keys
for ($i = 0; $i -lt $geminiKeys.Count; $i++) {
    $result = Test-GeminiKey -apiKey $geminiKeys[$i] -index $i
    $result.keyIndex = $i + 1
    $geminiResults += $result
    
    # Small delay between tests
    Start-Sleep -Milliseconds 1000
}

Write-Host "🚀 Starting OpenAI API Key Tests..." -ForegroundColor Magenta
Write-Host ""

# Test all OpenAI keys
for ($i = 0; $i -lt $openaiKeys.Count; $i++) {
    $result = Test-OpenAIKey -apiKey $openaiKeys[$i] -index $i
    $result.keyIndex = $i + 1
    $openaiResults += $result
    
    # Small delay between tests
    Start-Sleep -Milliseconds 1000
}

# Print summary
Write-Host "📋 SUMMARY REPORT" -ForegroundColor Cyan
Write-Host ""

Write-Host "Gemini API Keys:" -ForegroundColor Blue
$geminiWorking = ($geminiResults | Where-Object { $_.success }).Count
Write-Host "  Working: $geminiWorking/$($geminiResults.Count)"

foreach ($result in $geminiResults) {
    $status = if ($result.success) { "✅ WORKING" } else { "❌ FAILED" }
    $time = if ($result.responseTime) { "($($result.responseTime)ms)" } else { "" }
    Write-Host "  Key $($result.keyIndex): $status $time"
}

Write-Host ""
Write-Host "OpenAI API Keys:" -ForegroundColor Blue
$openaiWorking = ($openaiResults | Where-Object { $_.success }).Count
Write-Host "  Working: $openaiWorking/$($openaiResults.Count)"

foreach ($result in $openaiResults) {
    $status = if ($result.success) { "✅ WORKING" } else { "❌ FAILED" }
    $time = if ($result.responseTime) { "($($result.responseTime)ms)" } else { "" }
    Write-Host "  Key $($result.keyIndex): $status $time"
}

# Performance analysis
$geminiTimes = $geminiResults | Where-Object { $_.success } | ForEach-Object { $_.responseTime }
$openaiTimes = $openaiResults | Where-Object { $_.success } | ForEach-Object { $_.responseTime }

if ($geminiTimes.Count -gt 0) {
    $avgGemini = [math]::Round(($geminiTimes | Measure-Object -Sum).Sum / $geminiTimes.Count)
    Write-Host ""
    Write-Host "📊 Gemini avg response time: $($avgGemini)ms" -ForegroundColor Green
}

if ($openaiTimes.Count -gt 0) {
    $avgOpenai = [math]::Round(($openaiTimes | Measure-Object -Sum).Sum / $openaiTimes.Count)
    Write-Host "📊 OpenAI avg response time: $($avgOpenai)ms" -ForegroundColor Green
}

# Overall status
$totalWorking = $geminiWorking + $openaiWorking
$totalKeys = $geminiResults.Count + $openaiResults.Count

Write-Host ""
Write-Host "🎯 OVERALL: $totalWorking/$totalKeys API keys working ($([math]::Round(($totalWorking/$totalKeys)*100, 1))%)" -ForegroundColor Cyan

if ($totalWorking -eq $totalKeys) {
    Write-Host "🎉 All API keys are working perfectly!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some API keys need attention" -ForegroundColor Yellow
}