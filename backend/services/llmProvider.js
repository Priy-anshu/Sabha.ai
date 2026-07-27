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
        console.warn(`[LLM Network Warning]: ${err.message}. Retrying attempt ${i + 2}/${retries}...`);
        await new Promise(r => setTimeout(r, delay * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
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
      console.warn(`[Groq Model ${model} Warning]: ${err.message}. Trying next Groq model...`);
    }
  }
  throw lastErr;
}

/**
 * Unified LLM Provider Service
 * Supports Google Gemini (with 500 RPD Lite models priority), Groq (14,400 RPD fallback), OpenAI, and Grok (xAI).
 */
export async function callLLM({ prompt, systemInstruction = '', provider = process.env.DEFAULT_PROVIDER || 'gemini', temperature = 0.7 }) {
  const selectedProvider = provider.toLowerCase();

  try {
    if (selectedProvider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('GEMINI_API_KEY is not configured in backend/.env');
      }

      const genAI = new GoogleGenerativeAI(apiKey);

      // Prioritize High-Quota 500 RPD Lite models first so tokens stay longer!
      const modelsToTry = [
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3.5-flash',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-flash-latest'
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
            console.warn(`[Gemini Model ${modelName} Quota Exceeded]: Switching to next available Gemini model...`);
            continue;
          }
          throw err;
        }
      }

      // If ALL Gemini models hit rate limit or fail, fallback to Groq (14,400 RPD limit)!
      if (process.env.GROQ_API_KEY) {
        console.warn('⚠️ All Gemini models exhausted. Switching to Groq AI Fallback...');
        return await callGroq({ prompt, systemInstruction, temperature });
      }

      throw lastError;
    }

    if (selectedProvider === 'groq') {
      return await callGroq({ prompt, systemInstruction, temperature });
    }

    if (selectedProvider === 'openai' || selectedProvider === 'grok') {
      const apiKey = selectedProvider === 'grok' ? process.env.GROK_API_KEY : process.env.OPENAI_API_KEY;
      const baseURL = selectedProvider === 'grok' ? 'https://api.x.ai/v1' : undefined;

      if (!apiKey || apiKey.includes('your_')) {
        throw new Error(`${selectedProvider.toUpperCase()}_API_KEY is not configured in backend/.env`);
      }

      const openai = new OpenAI({ apiKey, baseURL });
      const model = selectedProvider === 'grok' ? 'grok-beta' : 'gpt-4o-mini';

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
    }

    throw new Error(`Unsupported LLM provider requested: ${selectedProvider}`);
  } catch (error) {
    console.error(`[LLM Service Error - ${selectedProvider}]:`, error.message);
    throw error;
  }
}
