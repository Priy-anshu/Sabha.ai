import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cosineSimilarity } from './services/ragService.js';
import { generateChatTitle } from './services/personaAllocator.js';
import { getSessionContext, updateSessionContext, formatContextPrompt } from './services/sessionCache.js';
import { connectDB } from './config/db.js';

dotenv.config();

async function testEmbeddingModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  const modelsToTest = ['gemini-embedding-001', 'gemini-embedding-2', 'text-embedding-004'];

  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.embedContent('PostgreSQL database row locks and deadlocks');
      console.log(`✅ Success with ${modelName}! Vector length: ${result.embedding.values.length}`);
      return modelName;
    } catch (err) {
      console.warn(`❌ ${modelName} failed: ${err.message}`);
    }
  }
  return null;
}

async function testTitleGenerator() {
  console.log('\n🏷️ Testing 3-4 Word Chat Title Generator...');
  const prompt1 = 'How do I configure MongoDB Atlas with Node.js and Express?';
  const prompt2 = 'What are the best security practices for JWT authentication in React apps?';

  const title1 = await generateChatTitle(prompt1);
  const title2 = await generateChatTitle(prompt2);

  console.log(`Prompt 1: "${prompt1}" ➔ Title: "${title1}"`);
  console.log(`Prompt 2: "${prompt2}" ➔ Title: "${title2}"`);
}

async function testSessionMemoryCache() {
  console.log('\n🧠 Testing In-Memory Session Context Cache...');
  const testSessionId = 'sess_test_memory_' + Date.now();

  console.log('Turn 1: User tells favorite actress...');
  await updateSessionContext(testSessionId, 'Alia Bhatt is my favorite actress.', 'Got it! I will remember that Alia Bhatt is your favorite actress.');

  const contextData = await getSessionContext(testSessionId);
  const formattedPrompt = formatContextPrompt(contextData);

  console.log('--- Formatted Context Prompt Sent to LLMs ---');
  console.log(formattedPrompt);
  console.log('---------------------------------------------');

  if (formattedPrompt.includes('Alia Bhatt')) {
    console.log('🎉 Session Memory Cache Test PASSED Cleanly!');
  } else {
    console.warn('⚠️ Session Memory Cache test failed to capture context.');
  }
}

async function runTest() {
  console.log('🧪 Testing Google Vector Generation & Cosine Similarity...');
  await connectDB();
  const workingModel = await testEmbeddingModels();
  await testSessionMemoryCache();

  if (!workingModel) {
    console.error('❌ No working embedding model found.');
    return;
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: workingModel });

  const textA = 'PostgreSQL database row locks, transactions, and deadlock handling.';
  const textB = 'How to resolve DB deadlock issues under high concurrency.';
  const textC = 'Vanilla cake baking recipe with flour, sugar, and butter.';

  const resA = await model.embedContent(textA);
  const resB = await model.embedContent(textB);
  const resC = await model.embedContent(textC);

  const vecA = resA.embedding.values;
  const vecB = resB.embedding.values;
  const vecC = resC.embedding.values;

  const simAB = cosineSimilarity(vecA, vecB);
  const simAC = cosineSimilarity(vecA, vecC);

  console.log('--------------------------------------------------');
  console.log(`Similarity (DB Locks vs DB Deadlock): ${(simAB * 100).toFixed(2)}%`);
  console.log(`Similarity (DB Locks vs Cake Recipe): ${(simAC * 100).toFixed(2)}%`);
  console.log('--------------------------------------------------');

  if (simAB > simAC && simAB > 0.4) {
    console.log('🎉 Vector RAG Cosine Similarity Test PASSED Cleanly!');
  }
}

runTest();
