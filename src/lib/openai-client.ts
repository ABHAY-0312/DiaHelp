// OpenAI API Keys with rotation (via OpenRouter)
const OPENAI_API_KEYS = [
  process.env.OPENAI_API_KEY,
  process.env.OPENAI_API_KEY_SECONDARY,
  process.env.OPENAI_API_KEY_TERTIARY,
].filter(Boolean); // Remove any undefined keys

// Debug log to see what keys are loaded
console.log('🔑 Loaded OpenAI keys:', OPENAI_API_KEYS.map((key, i) => `Key${i+1}: ${key?.substring(0, 15)}...`));

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Round-robin index for load distribution
let currentOpenAIKeyIndex = 0;

// Get next API key in rotation with better distribution
function getNextOpenAIKey(): string {
  if (OPENAI_API_KEYS.length === 0) {
    throw new Error('No OpenAI API keys configured');
  }
  
  // Use timestamp + random for better distribution in serverless environments
  const timeBasedIndex = Math.floor(Date.now() / 1000) % OPENAI_API_KEYS.length;
  const randomOffset = Math.floor(Math.random() * OPENAI_API_KEYS.length);
  const distributedIndex = (timeBasedIndex + randomOffset) % OPENAI_API_KEYS.length;
  
  const key = OPENAI_API_KEYS[distributedIndex];
  console.log(`🔄 Selected OpenAI key ${distributedIndex + 1}/${OPENAI_API_KEYS.length}: ${key?.substring(0, 15)}...`);
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
    max_tokens?: number;
  } = {}
): Promise<any> {
  const { temperature = 0.7, response_format, timeout = 10000, max_tokens } = options;
  
  // Use all available keys in order - no shuffling to ensure we try each key once
  const keyOrder = [...OPENAI_API_KEYS];
  
  for (let i = 0; i < keyOrder.length; i++) {
    const apiKey = keyOrder[i];
    if (!apiKey) continue;
    
    try {
      const keyIndex = i + 1; // Display index starting from 1
      console.log(`🚀 Attempt ${i + 1}/${keyOrder.length} - Using OpenAI key ${keyIndex}: ${apiKey.substring(0, 15)}...`);
      
      const requestBody: any = {
        model,
        messages,
        temperature,
      };
      
      if (response_format) {
        requestBody.response_format = response_format;
      }
      
      if (max_tokens) {
        requestBody.max_tokens = max_tokens;
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
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI API');
      }
      
      const successKeyIndex = i + 1;
      console.log(`✅ OpenAI API SUCCESS with key ${successKeyIndex}: ${apiKey.substring(0, 15)}...`);
      console.log(`Response preview: ${data.choices[0].message.content?.substring(0, 100)}...`);
      return data;
      
    } catch (error: any) {
      const errorKeyIndex = i + 1;
      console.warn(`❌ OpenAI key ${errorKeyIndex} ${apiKey.substring(0, 15)}... FAILED:`, error.message);
      
      // Add delay between retries
      if (i < keyOrder.length - 1) {
        const delay = Math.min(500 * (i + 1), 2000);
        console.log(`⏳ Waiting ${delay}ms before trying next OpenAI key...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Check if we should try the next key
      if (
        error.name === 'AbortError' || // Timeout
        error.message?.includes('402') || // Insufficient credits
        error.message?.includes('429') || // Rate limit
        error.message?.includes('503') || // Service unavailable
        error.message?.includes('502') || // Bad gateway
        error.message?.includes('500') || // Internal server error
        error.message?.includes('timeout') ||
        error.message?.includes('overloaded') ||
        error.message?.includes('more credits')
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
    keys: OPENAI_API_KEYS.map((key, index) => `Key${index + 1}: ${key?.substring(0, 15)}...`),
    hasAllKeys: OPENAI_API_KEYS.length === 3,
    keyStatuses: {
      key1: !!process.env.OPENAI_API_KEY,
      key2: !!process.env.OPENAI_API_KEY_2,
      key3: !!process.env.OPENAI_API_KEY_3,
    }
  };
}