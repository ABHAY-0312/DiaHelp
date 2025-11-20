@echo off
echo 🔍 DiaHelp API Key Testing
echo.

REM Check if .env.local exists
if exist ".env.local" (
    echo ✅ Found .env.local file
) else (
    echo ❌ .env.local file not found!
    echo Please create .env.local with your API keys
    pause
    exit /b 1
)

echo.
echo 🧪 Testing API endpoints manually...
echo.

echo 📝 To test your keys manually, use these curl commands:
echo.

echo ▶️ Test Gemini Key 1:
echo curl -H "x-goog-api-key: YOUR_GEMINI_KEY_1" ^
echo      -H "Content-Type: application/json" ^
echo      -d "{\"contents\":[{\"parts\":[{\"text\":\"Say hello\"}]}]}" ^
echo      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
echo.

echo ▶️ Test OpenAI Key 1:
echo curl -H "Authorization: Bearer YOUR_OPENAI_KEY_1" ^
echo      -H "Content-Type: application/json" ^
echo      -d "{\"model\":\"gpt-4o-mini\",\"messages\":[{\"role\":\"user\",\"content\":\"Say hello\"}],\"max_tokens\":10}" ^
echo      "https://api.openai.com/v1/chat/completions"
echo.

echo 💡 Replace YOUR_GEMINI_KEY_1 and YOUR_OPENAI_KEY_1 with your actual API keys
echo.
echo 🔄 To test key rotation, repeat with KEY_2 and KEY_3
echo.
echo ✅ If you get a JSON response with content, the key is working!
echo ❌ If you get an error, the key has issues.
echo.

pause