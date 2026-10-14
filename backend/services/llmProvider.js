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

// In-memory cache for Groq active models to prevent breaking on model deprecation
let cachedGroqModels = null;
let lastGroqFetchTime = 0;

/**
 * Dynamically fetch active chat models from Groq API
 * Refreshes cache every 1 hour (3600000 ms)
 */
async function getActiveGroqModels(openai) {
  const now = Date.now();
  if (cachedGroqModels && cachedGroqModels.length > 0 && (now - lastGroqFetchTime < 3600000)) {
    return cachedGroqModels;
  }

  try {
    const list = await openai.models.list();
    const chatModels = list.data
      .map(m => m.id)
      .filter(id => !id.includes('whisper') && !id.includes('guard') && !id.includes('orpheus') && !id.includes('safeguard'));

    // Prioritize high-performance conversational models
    const sorted = chatModels.sort((a, b) => {
      const getScore = (name) => {
        if (name.includes('qwen')) return 3;
        if (name.includes('gpt-oss')) return 2;
        if (name.includes('llama')) return 1;
        return 0;
      };
      return getScore(b) - getScore(a);
    });

    if (sorted.length > 0) {
      cachedGroqModels = sorted;
      lastGroqFetchTime = now;
      console.log('🤖 [Groq Auto-Discovery]: Discovered active models:', cachedGroqModels);
      return cachedGroqModels;
    }
  } catch (err) {
    console.warn('⚠️ [Groq Auto-Discovery]: Could not fetch models dynamically, falling back to verified list:', err.message);
  }

  return ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
}

/**
 * Call Groq API with Dynamic Model Auto-Discovery
 */
async function callGroq({ prompt, systemInstruction, temperature }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes('your_')) {
    throw new Error('GROQ_API_KEY is not configured in backend/.env');
  }

  const openai = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
  const groqModels = await getActiveGroqModels(openai);

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
      const isRecoverableError = err.message && (
        err.message.includes('400') ||
        err.message.includes('404') ||
        err.message.includes('429') ||
        err.message.includes('Rate limit') ||
        err.message.includes('decommissioned') ||
        err.message.includes('not exist')
      );
      if (isRecoverableError) {
        console.warn(`🚨 [Groq Model Failed - ${model}]: ${err.message}. Trying next available model...`);
        continue;
      }
      throw err;
    }
  }

  throw lastErr || new Error('All discovered Groq models failed');
}

/**
 * Unified LLM Provider Service with Clean Fallback:
 * If primary provider fails, attempts secondary provider without recursion
 */
export async function callLLM({ prompt, systemInstruction = '', provider = process.env.DEFAULT_PROVIDER || 'groq', temperature = 0.7 }) {
  const selectedProvider = provider.toLowerCase();

  // Try Groq as primary (or if selected)
  if (selectedProvider === 'groq') {
    try {
      return await callGroq({ prompt, systemInstruction, temperature });
    } catch (groqErr) {
      console.warn('⚡ [Groq Unavailable]: Attempting fallback to Gemini...', groqErr.message);
      if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_')) {
        return await callGeminiDirect({ prompt, systemInstruction, temperature });
      }
      throw groqErr;
    }
  }

  // Try Gemini
  if (selectedProvider === 'gemini') {
    try {
      return await callGeminiDirect({ prompt, systemInstruction, temperature });
    } catch (geminiErr) {
      console.warn('⚡ [Gemini Unavailable]: Attempting fallback to Groq Auto-Discovery...', geminiErr.message);
      if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('your_')) {
        return await callGroq({ prompt, systemInstruction, temperature });
      }
      throw geminiErr;
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
}
