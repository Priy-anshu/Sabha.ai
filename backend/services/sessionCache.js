import { ChatDetails } from '../models/ChatDetails.js';
import { callLLM } from './llmProvider.js';

/**
 * In-Memory LRU/TTL Session Context Cache
 * Stores distilled context summaries and recent turns per sessionId.
 */
const sessionMap = new Map();
const MAX_CACHE_SIZE = 100; // Store up to 100 active sessions in memory

export async function getSessionContext(sessionId) {
  if (!sessionId) return { summary: '', recentTurns: [] };

  // 1. Check In-Memory Cache (HIT)
  if (sessionMap.has(sessionId)) {
    const cached = sessionMap.get(sessionId);
    cached.lastAccessed = Date.now();
    console.log(`⚡ [Session Cache HIT]: Retrieved context instantly for ${sessionId}`);
    return cached;
  }

  // 2. Cache MISS: Load from MongoDB ChatDetails
  try {
    const details = await ChatDetails.find({ sessionId }).sort({ timestamp: 1 });
    if (!details || details.length === 0) {
      const emptyData = { summary: '', recentTurns: [], lastAccessed: Date.now() };
      sessionMap.set(sessionId, emptyData);
      return emptyData;
    }

    // Extract recent turns (up to last 6 messages)
    const recentTurns = details.slice(-6).map(d => ({
      sender: d.sender,
      text: d.text
    }));

    // Build initial summary string from prior messages
    let summaryText = '';
    if (details.length > 2) {
      summaryText = details.map(d => `${d.sender === 'user' ? 'User' : 'Assistant'}: ${d.text}`).slice(0, -2).join('\n');
    } else {
      summaryText = recentTurns.map(t => `${t.sender === 'user' ? 'User' : 'Assistant'}: ${t.text}`).join('\n');
    }

    const sessionData = {
      summary: summaryText,
      recentTurns,
      lastAccessed: Date.now()
    };

    // Evict oldest session if cache exceeds MAX_CACHE_SIZE
    if (sessionMap.size >= MAX_CACHE_SIZE) {
      const oldestKey = [...sessionMap.entries()].sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)[0]?.[0];
      if (oldestKey) sessionMap.delete(oldestKey);
    }

    sessionMap.set(sessionId, sessionData);
    console.log(`💾 [Session Cache LOAD]: Loaded ${details.length} turns from MongoDB into Cache for ${sessionId}`);
    return sessionData;
  } catch (err) {
    console.warn(`[Session Cache Error]: ${err.message}`);
    return { summary: '', recentTurns: [] };
  }
}

/**
 * Updates the in-memory cache with the latest user question and assistant answer turn,
 * and asynchronously condenses the summary.
 */
export async function updateSessionContext(sessionId, userPrompt, assistantAnswer) {
  if (!sessionId) return;

  const current = await getSessionContext(sessionId);

  // Append new turn to recentTurns
  const newTurnUser = { sender: 'user', text: userPrompt };
  const newTurnAi = { sender: 'ai', text: assistantAnswer };

  const updatedTurns = [...(current.recentTurns || []), newTurnUser, newTurnAi].slice(-6);

  // Distill/Update summary asynchronously
  let updatedSummary = current.summary || '';
  try {
    if (updatedTurns.length >= 4) {
      const summaryPrompt = `Existing Chat Summary:\n"${current.summary}"\n\nNew Turn:\nUser: "${userPrompt}"\nAssistant: "${assistantAnswer}"\n\nUpdate and condense the chat summary in 2-3 sentences. Preserve all key facts, user preferences (e.g. favorite topics/names/choices), and core context.`;

      const newSummary = await callLLM({
        prompt: summaryPrompt,
        systemInstruction: 'You are a chat memory summarizer. Distill key facts and preferences into 2-3 clear sentences.',
        temperature: 0.2
      });

      if (newSummary && newSummary.trim().length > 0) {
        updatedSummary = newSummary.trim();
      }
    } else {
      updatedSummary = updatedTurns.map(t => `${t.sender === 'user' ? 'User' : 'Assistant'}: ${t.text}`).join('\n');
    }
  } catch (err) {
    console.warn(`[Summary Distillation Warning]: ${err.message}`);
  }

  sessionMap.set(sessionId, {
    summary: updatedSummary,
    recentTurns: updatedTurns,
    lastAccessed: Date.now()
  });

  console.log(`⚡ [Session Cache UPDATED]: Cached latest turn & summary for ${sessionId}`);
}

/**
 * Formats cached context into a prompt string for LLMs
 */
export function formatContextPrompt(sessionData) {
  if (!sessionData) return '';
  const { summary, recentTurns } = sessionData;

  let contextStr = '';
  if (summary && summary.trim().length > 0) {
    contextStr += `[PREVIOUS CHAT SUMMARY & USER PREFERENCES]:\n${summary}\n\n`;
  }

  if (recentTurns && recentTurns.length > 0) {
    contextStr += `[RECENT MESSAGES]:\n` + recentTurns.map(t => `${t.sender === 'user' ? 'User' : 'Assistant'}: ${t.text}`).join('\n') + `\n\n`;
  }

  return contextStr;
}
