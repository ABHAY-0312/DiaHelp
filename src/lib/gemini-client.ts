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

// Call Gemini with automatic key fallback and model degradation
export async function callGeminiWithFallback(
  prompt: string | Array<any>,
  modelName: string = 'gemini-2.5-flash',
  timeout: number = 15000
): Promise<any> {
  // Define model fallback hierarchy
  const getModelFallbackChain = (primaryModel: string): string[] => {
    if (primaryModel === 'gemini-2.5-pro') {
      return ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    } else if (primaryModel === 'gemini-2.5-flash') {
      return ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    } else {
      return [primaryModel]; // Use only the specified model
    }
  };

  const modelChain = getModelFallbackChain(modelName);
  
  // Try each model in the fallback chain
  for (let modelIndex = 0; modelIndex < modelChain.length; modelIndex++) {
    const currentModel = modelChain[modelIndex];
    console.log(`🎯 Trying model: ${currentModel} (${modelIndex + 1}/${modelChain.length})`);
    
    // Try all API keys for current model - use sequential order to ensure all keys are tried
    const maxAttempts = GEMINI_API_KEYS.length;
    console.log(`📋 Will try all ${maxAttempts} keys for ${currentModel}`);
    
    for (let i = 0; i < maxAttempts; i++) {
      const apiKey = GEMINI_API_KEYS[i]; // Sequential access to ensure all keys are tried
      
      try {
        console.log(`🚀 Model: ${currentModel} | Key ${i + 1}: ${apiKey.substring(0, 10)}... | Attempt ${i + 1}/${maxAttempts}`);
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: currentModel });
        
        // Add timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Gemini API timeout')), timeout)
        );
        
        const apiPromise = Array.isArray(prompt) 
          ? model.generateContent(prompt)
          : model.generateContent(prompt);
        
        const result = await Promise.race([apiPromise, timeoutPromise]);
        console.log(`✅ SUCCESS: ${currentModel} with key ${i + 1}: ${apiKey.substring(0, 10)}...`);
        return result;
        
      } catch (error: any) {
        console.warn(`❌ FAILED: ${currentModel} | Key ${i + 1} | Error: ${error.message}`);
        
        // Add delay between retries (exponential backoff)
        if (i < maxAttempts - 1) {
          const delay = Math.min(300 * (i + 1), 1500); // 300ms, 600ms, 900ms, 1.2s, 1.5s max
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
          // For other errors (auth, invalid request, etc.), don't retry with other keys
          console.error(`💥 Non-retryable error: ${currentModel} | Key ${i + 1} | ${error.message}`);
          break; // Skip to next model
        }
      }
    }
    
    // All keys failed for this model, try next model
    if (modelIndex < modelChain.length - 1) {
      console.warn(`⚠️ All keys failed for ${currentModel}, degrading to next model...`);
    }
  }
  
  // All models and keys failed
  console.error(`🚨 COMPLETE FAILURE: All models ${modelChain.join(', ')} failed across all ${GEMINI_API_KEYS.length} keys!`);
  throw new Error(`All Gemini models (${modelChain.join(', ')}) failed across all ${GEMINI_API_KEYS.length} API keys`);
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