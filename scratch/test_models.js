const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

async function listModels() {
  try {
    // Manually parse .env.local
    const env = fs.readFileSync('.env.local', 'utf8');
    const keyMatch = env.match(/GEMINI_API_KEY=([^\s]+)/);
    const apiKey = keyMatch ? keyMatch[1] : null;

    if (!apiKey) {
      console.log('❌ GEMINI_API_KEY not found in .env.local');
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Testing specific models
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp', 'gemini-2.5-flash'];
    
    console.log(`Checking models for key: ${apiKey.substring(0, 5)}...`);
    
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        // Minimal request to check access
        await model.generateContent('Hi');
        console.log(`✅ ${m}: Accessible`);
      } catch (e) {
        const msg = e.message.split('\n')[0];
        if (msg.includes('429')) {
          console.log(`🟡 ${m}: Rate Limited (Accessible but quota full)`);
        } else {
          console.log(`❌ ${m}: ${msg}`);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

listModels();
