const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

async function testModel() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const keyMatch = env.match(/GEMINI_API_KEY=([^\s]+)/);
  const apiKey = keyMatch ? keyMatch[1] : null;
  if (!apiKey) { console.log('No key found'); return; }

  const genAI = new GoogleGenerativeAI(apiKey);
  const models = [
    'gemini-3.1-flash-lite-preview',
    'gemini-3.1-flash-lite',
  ];

  for (const m of models) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent('Say hello in one word');
      console.log(`✅ ${m}: ${result.response.text().trim()}`);
    } catch (e) {
      const msg = e.message.split('\n')[0];
      if (msg.includes('429')) {
        console.log(`🟡 ${m}: Rate Limited (but accessible)`);
      } else {
        console.log(`❌ ${m}: ${msg}`);
      }
    }
  }
}

testModel();
