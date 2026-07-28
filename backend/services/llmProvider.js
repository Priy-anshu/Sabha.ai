import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

dotenv.config();

/**
 * Helper to execute an async function with retry for transient network errors
 */
async function withRetry(fn, retries = 2, delay = 800) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isNetworkError = err.message && (
        err.message.includes('fetch failed') ||
        err.message.includes('ETIMEDOUT') ||
        err.message.includes('ECONNRESET') ||
        err.message.includes('socket hang up')
      );
      if (isNetworkError && i < retries - 1) {
        await new Promise(r => setTimeout(r, delay * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/**
 * Direct Gemini Call with Model Fallback
 */
async function callGeminiDirect({ prompt, systemInstruction, temperature }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in backend/.env');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTry = [
    'gemini-flash-latest',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash'
  ];

  let lastError;
  for (const modelName of modelsToTry) {
    try {
      return await withRetry(async () => {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction || undefined
        });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature }
        });

        return result.response.text();
      });
    } catch (err) {
      lastError = err;
      const isModelUnavailableOrQuota = err.message && (
        err.message.includes('404') ||
        err.message.includes('no longer available') ||
        err.message.includes('429') ||
        err.message.includes('Quota exceeded') ||
        err.message.includes('RESOURCE_EXHAUSTED')
      );
      if (isModelUnavailableOrQuota) {
        console.warn(`🚨 [QUOTA / RATE LIMIT - Gemini ${modelName}]: Switching to next model...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Call Groq API (High Speed, 14,400 RPD Free Tier)
 */
async function callGroq({ prompt, systemInstruction, temperature }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes('your_')) {
    throw new Error('GROQ_API_KEY is not configured in backend/.env');
  }

  const openai = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
  const groqModels = ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'];

  let lastErr;
  for (const model of groqModels) {
    try {
      return await withRetry(async () => {
        const messages = [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const completion = await openai.chat.completions.create({
          model,
          messages,
          temperature
        });

        return completion.choices[0]?.message?.content || '';
      });
    } catch (err) {
      lastErr = err;
      const isQuotaOrLimit = err.message && (
        err.message.includes('429') ||
        err.message.includes('Rate limit') ||
        err.message.includes('tokens per minute')
      );
      if (isQuotaOrLimit) {
        console.warn(`🚨 [QUOTA / RATE LIMIT - Groq ${model}]: Switching to next Groq model...`);
        continue;
      }
    }
  }

  // If ALL Groq models exhaust, fallback back to Gemini Ring!
  console.warn('⚡ [ALL GROQ MODELS EXHAUSTED]: Falling back to Gemini AI Ring...');
  return await callGeminiDirect({ prompt, systemInstruction, temperature });
}

/**
 * Unified LLM Provider Service with 360-Degree Fallback Ring Loop:
 * Gemini (3 models) <---> Groq (3 models)
 */
export async function callLLM({ prompt, systemInstruction = '', provider = process.env.DEFAULT_PROVIDER || 'gemini', temperature = 0.7 }) {
  const selectedProvider = provider.toLowerCase();

  try {
    if (selectedProvider === 'gemini') {
      try {
        return await callGeminiDirect({ prompt, systemInstruction, temperature });
      } catch (geminiErr) {
        if (process.env.GROQ_API_KEY) {
          console.warn('⚡ [ALL GEMINI MODELS EXHAUSTED]: Switching to Groq AI 14,400 RPD Fallback Ring...');
          return await callGroq({ prompt, systemInstruction, temperature });
        }
        throw geminiErr;
      }
    }

    if (selectedProvider === 'groq') {
      try {
        return await callGroq({ prompt, systemInstruction, temperature });
      } catch (groqErr) {
        console.warn('⚡ [ALL GROQ MODELS EXHAUSTED]: Switching to Gemini AI Fallback Ring...');
        return await callGeminiDirect({ prompt, systemInstruction, temperature });
      }
    }

    if (selectedProvider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey.includes('your_')) {
        throw new Error('OPENAI_API_KEY is not configured in backend/.env');
      }
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          { role: 'user', content: prompt }
        ],
        temperature
      });
      return completion.choices[0]?.message?.content || '';
    }

    throw new Error(`Unsupported LLM provider: ${provider}`);
  } catch (error) {
    console.error(`❌ [LLM PROVIDER FATAL ERROR]: ${error.message}`);
    throw error;
  }
}
