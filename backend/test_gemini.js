import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function testNewModels() {
  const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash-lite'];
  for (const m of models) {
    try {
      console.log(`Testing ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent('Hi, reply in 5 words.');
      console.log(`✅ SUCCESS with ${m}:`, res.response.text());
      return;
    } catch (err) {
      console.error(`❌ FAILED with ${m}:`, err.message);
    }
  }
}

testNewModels();
