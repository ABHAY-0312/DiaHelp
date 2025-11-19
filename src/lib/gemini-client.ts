import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API Keys with rotation
const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean); // Remove any undefined keys

// Round-robin index for load distribution - use timestamp-based rotation for better distribution
let currentKeyIndex = 0;

// Get next API key in rotation with better distribution
function getNextGeminiKey(): string {
  if (GEMINI_API_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured');
  }
  
  // Use timestamp + random for better distribution in serverless environments
  const timeBasedIndex = Math.floor(Date.now() / 1000) % GEMINI_API_KEYS.length;
  const randomOffset = Math.floor(Math.random() * GEMINI_API_KEYS.length);
  const distributedIndex = (timeBasedIndex + randomOffset) % GEMINI_API_KEYS.length;
  
  const key = GEMINI_API_KEYS[distributedIndex];
  console.log(`🔄 Selected Gemini key ${distributedIndex + 1}/${GEMINI_API_KEYS.length}: ${key.substring(0, 10)}...`);
  return key!;
}

// Create Gemini model with key rotation and fallback
export async function createGeminiModel(modelName: string = 'gemini-2.5-flash') {
  const primaryKey = getNextGeminiKey();
  const genAI = new GoogleGenerativeAI(primaryKey);
  return genAI.getGenerativeModel({ model: modelName });
}

// Call Gemini with automatic key fallback
export async function callGeminiWithFallback(
  prompt: string | Array<any>,
  modelName: string = 'gemini-2.5-flash',
  timeout: number = 15000
): Promise<any> {
  const usedKeys = new Set<string>();
  const maxAttempts = GEMINI_API_KEYS.length;
  
  for (let i = 0; i < maxAttempts; i++) {
    // Get a key we haven't tried yet
    let apiKey: string;
    let attempts = 0;
    do {
      apiKey = getNextGeminiKey();
      attempts++;
    } while (usedKeys.has(apiKey) && attempts < 10); // Avoid infinite loop
    
    usedKeys.add(apiKey);
    
    try {
      console.log(`🚀 Attempt ${i + 1}/${maxAttempts} - Using Gemini key: ${apiKey.substring(0, 10)}...`);
      
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
      console.log(`✅ Gemini API SUCCESS with key: ${apiKey.substring(0, 10)}...`);
      return result;
      
    } catch (error: any) {
      console.warn(`❌ Gemini key ${apiKey.substring(0, 10)}... FAILED:`, error.message);
      
      // Add delay between retries (exponential backoff)
      if (i < maxAttempts - 1) {
        const delay = Math.min(500 * (i + 1), 2000); // 500ms, 1s, 2s max
        console.log(`⏳ Waiting ${delay}ms before trying next key...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Check if we should try the next key
      if (
        error.status === 429 ||  // Rate limit
        error.status === 503 ||  // Service unavailable 
        error.status === 500 ||  // Internal server error
        error.message?.includes('timeout') ||
        error.message?.includes('overloaded') ||
        error.message?.includes('quota') ||
        error.message?.includes('exceeded')
      ) {
        // Try next key
        continue;
      } else {
        // For other errors (auth, invalid request, etc.), don't retry
        console.error(`💥 Non-retryable error with key ${apiKey.substring(0, 10)}...:`, error.message);
        throw error;
      }
    }
  }
  
  // All keys failed
  console.error(`🚨 ALL ${GEMINI_API_KEYS.length} Gemini API keys FAILED!`);
  throw new Error(`All ${GEMINI_API_KEYS.length} Gemini API keys failed`);
}

// Get current key statistics
export function getGeminiKeyStats() {
  return {
    totalKeys: GEMINI_API_KEYS.length,
    currentKeyIndex,
    keys: GEMINI_API_KEYS.map((key, index) => `Key${index + 1}: ${key?.substring(0, 10)}...`),
    hasAllKeys: GEMINI_API_KEYS.length === 3,
    keyStatuses: {
      key1: !!process.env.GEMINI_API_KEY,
      key2: !!process.env.GEMINI_API_KEY_2,
      key3: !!process.env.GEMINI_API_KEY_3,
    }
  };
}