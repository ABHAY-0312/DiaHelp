import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API Keys with rotation
const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean); // Remove any undefined keys

// Round-robin index for load distribution
let currentKeyIndex = 0;

// Get next API key in rotation
function getNextGeminiKey(): string {
  if (GEMINI_API_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured');
  }
  
  const key = GEMINI_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
  return key!;
}

// Create Gemini model with key rotation and fallback
export async function createGeminiModel(modelName: string = 'gemini-2.5-pro') {
  const primaryKey = getNextGeminiKey();
  const genAI = new GoogleGenerativeAI(primaryKey);
  return genAI.getGenerativeModel({ model: modelName });
}

// Call Gemini with automatic key fallback
export async function callGeminiWithFallback(
  prompt: string | Array<any>,
  modelName: string = 'gemini-2.5-pro',
  timeout: number = 10000
): Promise<any> {
  const usedKeys = new Set<string>();
  let attemptCount = 0;
  
  for (const apiKey of GEMINI_API_KEYS) {
    if (!apiKey || usedKeys.has(apiKey)) continue;
    usedKeys.add(apiKey);
    
    try {
      console.log(`Trying Gemini API key: ${apiKey.substring(0, 10)}...`);
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Add timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API timeout')), timeout)
      );
      
      const apiPromise = Array.isArray(prompt) 
        ? model.generateContent(prompt)
        : model.generateContent(prompt);
      
      const result = await Promise.race([apiPromise, timeoutPromise]);
      console.log(`✅ Gemini API success with key: ${apiKey.substring(0, 10)}...`);
      return result;
      
    } catch (error: any) {
      console.warn(`❌ Gemini API key ${apiKey.substring(0, 10)}... failed:`, error.message);
      attemptCount++;
      
      // Add delay between retries (exponential backoff)
      if (attemptCount < GEMINI_API_KEYS.length) {
        const delay = Math.min(1000 * attemptCount, 3000); // 1s, 2s, 3s max
        console.log(`Waiting ${delay}ms before trying next key...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Check if we should try the next key
      if (
        error.status === 429 ||  // Rate limit
        error.status === 503 ||  // Service unavailable 
        error.status === 500 ||  // Internal server error
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
  throw new Error(`All ${GEMINI_API_KEYS.length} Gemini API keys failed`);
}

// Get current key statistics
export function getGeminiKeyStats() {
  return {
    totalKeys: GEMINI_API_KEYS.length,
    currentKeyIndex,
    keys: GEMINI_API_KEYS.map(key => key?.substring(0, 10) + '...')
  };
}