import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import 'dotenv/config';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// API Keys
const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean);

const OPENAI_API_KEYS = [
  process.env.OPENAI_API_KEY,
  process.env.OPENAI_API_KEY_2,
  process.env.OPENAI_API_KEY_3,
].filter(Boolean);

console.log(`${colors.cyan}🔍 API Key Testing Script${colors.reset}\n`);
console.log(`${colors.blue}📊 Found ${GEMINI_API_KEYS.length} Gemini keys and ${OPENAI_API_KEYS.length} OpenAI keys${colors.reset}\n`);

// Test Gemini API Key
async function testGeminiKey(apiKey, index) {
  try {
    console.log(`${colors.yellow}🧪 Testing Gemini Key ${index + 1}: ${apiKey.substring(0, 10)}...${colors.reset}`);
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const startTime = Date.now();
    const result = await Promise.race([
      model.generateContent("Say 'test successful' in exactly 2 words"),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]);
    
    const responseTime = Date.now() - startTime;
    const response = result.response.text().trim();
    
    console.log(`${colors.green}✅ Gemini Key ${index + 1} SUCCESS (${responseTime}ms)${colors.reset}`);
    console.log(`   Response: "${response}"\n`);
    
    return { success: true, responseTime, response, error: null };
  } catch (error) {
    console.log(`${colors.red}❌ Gemini Key ${index + 1} FAILED${colors.reset}`);
    console.log(`   Error: ${error.message}\n`);
    
    return { success: false, responseTime: null, response: null, error: error.message };
  }
}

// Test OpenAI API Key
async function testOpenAIKey(apiKey, index) {
  try {
    console.log(`${colors.yellow}🧪 Testing OpenAI Key ${index + 1}: ${apiKey.substring(0, 10)}...${colors.reset}`);
    
    const openai = new OpenAI({ apiKey });
    
    const startTime = Date.now();
    const result = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: "Say 'test successful' in exactly 2 words" }],
        max_tokens: 10,
        temperature: 0
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]);
    
    const responseTime = Date.now() - startTime;
    const response = result.choices[0]?.message?.content?.trim() || 'No response';
    
    console.log(`${colors.green}✅ OpenAI Key ${index + 1} SUCCESS (${responseTime}ms)${colors.reset}`);
    console.log(`   Response: "${response}"\n`);
    
    return { success: true, responseTime, response, error: null };
  } catch (error) {
    console.log(`${colors.red}❌ OpenAI Key ${index + 1} FAILED${colors.reset}`);
    console.log(`   Error: ${error.message}\n`);
    
    return { success: false, responseTime: null, response: null, error: error.message };
  }
}

// Main testing function
async function testAllKeys() {
  const results = {
    gemini: [],
    openai: []
  };

  console.log(`${colors.magenta}🚀 Starting Gemini API Key Tests...${colors.reset}\n`);
  
  // Test all Gemini keys
  for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
    const result = await testGeminiKey(GEMINI_API_KEYS[i], i);
    results.gemini.push({ keyIndex: i + 1, ...result });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`${colors.magenta}🚀 Starting OpenAI API Key Tests...${colors.reset}\n`);
  
  // Test all OpenAI keys
  for (let i = 0; i < OPENAI_API_KEYS.length; i++) {
    const result = await testOpenAIKey(OPENAI_API_KEYS[i], i);
    results.openai.push({ keyIndex: i + 1, ...result });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log(`${colors.cyan}📋 SUMMARY REPORT${colors.reset}\n`);
  
  console.log(`${colors.blue}Gemini API Keys:${colors.reset}`);
  const geminiWorking = results.gemini.filter(r => r.success).length;
  console.log(`  Working: ${geminiWorking}/${results.gemini.length}`);
  results.gemini.forEach(r => {
    const status = r.success ? `${colors.green}✅ WORKING${colors.reset}` : `${colors.red}❌ FAILED${colors.reset}`;
    const time = r.responseTime ? `(${r.responseTime}ms)` : '';
    console.log(`  Key ${r.keyIndex}: ${status} ${time}`);
  });
  
  console.log(`\n${colors.blue}OpenAI API Keys:${colors.reset}`);
  const openaiWorking = results.openai.filter(r => r.success).length;
  console.log(`  Working: ${openaiWorking}/${results.openai.length}`);
  results.openai.forEach(r => {
    const status = r.success ? `${colors.green}✅ WORKING${colors.reset}` : `${colors.red}❌ FAILED${colors.reset}`;
    const time = r.responseTime ? `(${r.responseTime}ms)` : '';
    console.log(`  Key ${r.keyIndex}: ${status} ${time}`);
  });

  // Performance analysis
  const geminiTimes = results.gemini.filter(r => r.success).map(r => r.responseTime);
  const openaiTimes = results.openai.filter(r => r.success).map(r => r.responseTime);
  
  if (geminiTimes.length > 0) {
    const avgGemini = (geminiTimes.reduce((a, b) => a + b, 0) / geminiTimes.length).toFixed(0);
    console.log(`\n${colors.green}📊 Gemini avg response time: ${avgGemini}ms${colors.reset}`);
  }
  
  if (openaiTimes.length > 0) {
    const avgOpenai = (openaiTimes.reduce((a, b) => a + b, 0) / openaiTimes.length).toFixed(0);
    console.log(`${colors.green}📊 OpenAI avg response time: ${avgOpenai}ms${colors.reset}`);
  }

  // Overall status
  const totalWorking = geminiWorking + openaiWorking;
  const totalKeys = results.gemini.length + results.openai.length;
  
  console.log(`\n${colors.cyan}🎯 OVERALL: ${totalWorking}/${totalKeys} API keys working (${((totalWorking/totalKeys)*100).toFixed(1)}%)${colors.reset}`);
  
  if (totalWorking === totalKeys) {
    console.log(`${colors.green}🎉 All API keys are working perfectly!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  Some API keys need attention${colors.reset}`);
  }
}

// Run the tests
testAllKeys().catch(console.error);