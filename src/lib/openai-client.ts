// OpenAI API Keys with rotation (via OpenRouter)
const OPENAI_API_KEYS = [
  process.env.OPENAI_API_KEY,
  process.env.OPENAI_API_KEY_2,
  process.env.OPENAI_API_KEY_3,
].filter(Boolean); // Remove any undefined keys

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Round-robin index for load distribution
let currentOpenAIKeyIndex = 0;

// Get next API key in rotation
function getNextOpenAIKey(): string {
  if (OPENAI_API_KEYS.length === 0) {
    throw new Error('No OpenAI API keys configured');
  }
  
  const key = OPENAI_API_KEYS[currentOpenAIKeyIndex];
  currentOpenAIKeyIndex = (currentOpenAIKeyIndex + 1) % OPENAI_API_KEYS.length;
  return key!;
}

// Call OpenAI with automatic key fallback
export async function callOpenAIWithFallback(
  model: string = 'openai/gpt-3.5-turbo',
  messages: Array<{ role: string; content: string }>,
  options: {
    temperature?: number;
    response_format?: { type: string };
    timeout?: number;
  } = {}
): Promise<any> {
  const { temperature = 0.7, response_format, timeout = 10000 } = options;
  const usedKeys = new Set<string>();
  
  for (const apiKey of OPENAI_API_KEYS) {
    if (!apiKey || usedKeys.has(apiKey)) continue;
    usedKeys.add(apiKey);
    
    try {
      console.log(`Trying OpenAI API key: ${apiKey.substring(0, 15)}...`);
      
      const requestBody: any = {
        model,
        messages,
        temperature,
      };
      
      if (response_format) {
        requestBody.response_format = response_format;
      }
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ OpenAI API success with key: ${apiKey.substring(0, 15)}...`);
      return data;
      
    } catch (error: any) {
      console.warn(`❌ OpenAI API key ${apiKey.substring(0, 15)}... failed:`, error.message);
      
      // Check if we should try the next key
      if (
        error.name === 'AbortError' || // Timeout
        error.message?.includes('429') || // Rate limit
        error.message?.includes('503') || // Service unavailable
        error.message?.includes('502') || // Bad gateway
        error.message?.includes('500') || // Internal server error
        error.message?.includes('timeout') ||
        error.message?.includes('overloaded')
      ) {
        // Try next key
        continue;
      } else {
        // For other errors, don't retry with other keys
        throw error;
      }
    }
  }
  
  // All keys failed
  throw new Error(`All ${OPENAI_API_KEYS.length} OpenAI API keys failed`);
}

// Get current key statistics
export function getOpenAIKeyStats() {
  return {
    totalKeys: OPENAI_API_KEYS.length,
    currentKeyIndex: currentOpenAIKeyIndex,
    keys: OPENAI_API_KEYS.map(key => key?.substring(0, 15) + '...')
  };
}