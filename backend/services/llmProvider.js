import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

dotenv.config();

/**
 * Unified LLM Provider Service
 * Supports Google Gemini, OpenAI, and Grok (xAI) via environment variables.
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
      const modelsToTry = [
        process.env.GEMINI_MODEL || 'gemini-flash-latest',
        'gemini-2.0-flash-lite',
        'gemini-pro-latest',
        'gemini-2.0-flash'
      ];

      let lastError;
      for (const modelName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemInstruction || undefined
          });

          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature }
          });

          return result.response.text();
        } catch (err) {
          lastError = err;
          if (err.message && (err.message.includes('404') || err.message.includes('no longer available'))) {
            console.warn(`[Gemini Model ${modelName} unavailable]: Trying next model...`);
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    }

    if (selectedProvider === 'openai' || selectedProvider === 'grok') {
      const apiKey = selectedProvider === 'grok' ? process.env.GROK_API_KEY : process.env.OPENAI_API_KEY;
      const baseURL = selectedProvider === 'grok' ? 'https://api.x.ai/v1' : undefined;

      if (!apiKey || apiKey.includes('your_')) {
        throw new Error(`${selectedProvider.toUpperCase()}_API_KEY is not configured in backend/.env`);
      }

      const openai = new OpenAI({ apiKey, baseURL });
      const model = selectedProvider === 'grok' ? 'grok-beta' : 'gpt-4o-mini';

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
    }

    throw new Error(`Unsupported LLM provider requested: ${selectedProvider}`);
  } catch (error) {
    console.error(`[LLM Service Error - ${selectedProvider}]:`, error.message);
    throw error;
  }
}
