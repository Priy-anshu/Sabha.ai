import { callLLM } from './llmProvider.js';

/**
 * Detects if a prompt is creative or technical to scale temperature accordingly.
 */
function detectTemperature(prompt) {
  const creativeKeywords = ['story', 'poem', 'script', 'creative', 'brainstorm', 'novel', 'plot', 'character', 'song', 'essay'];
  const isCreative = creativeKeywords.some(kw => prompt.toLowerCase().includes(kw));
  return isCreative ? 0.95 : 0.3;
}

/**
 * Step A: Dynamic Persona Allocator Agent
 * Analyzes prompt & session context to return 3-5 specialized personas with easy Indian names.
 */
export async function allocatePersonas(userPrompt, existingPersonas = [], provider = 'gemini') {
  const temperature = detectTemperature(userPrompt);

  const existingContext = existingPersonas.length > 0
    ? `Current Chat Personas: ${JSON.stringify(existingPersonas.map(p => p.name))}\nAnalyze if a NEW specialist persona is needed for this new follow-up prompt. If current personas cover it, return the existing ones.`
    : `No existing personas. Allocate 3 to 5 specialized expert personas for this new topic.`;

  const systemInstruction = `You are an expert AI Multi-Agent System Coordinator.
Your task is to analyze the user's prompt and determine specialized expert personas best suited to debate and solve the task.

${existingContext}

CRITICAL INSTRUCTIONS FOR PERSONA NAMING & ROLES:
1. Every persona MUST be given a clear, easily pronounceable Indian human name paired with their expert title for high user engagement (e.g., "Arjun (System Architect)", "Priya (Security Auditor)", "Rohan (Product Lead)", "Ananya (Creative Writer)", "Kabir (UX Specialist)", "Vikram (Code Quality Engineer)").
2. Choose personas with contrasting perspectives.
3. Mindset instructions must be generic (e.g., "Critique the previous solution for flaws and suggest new improvements").
4. Respond ONLY with a valid, clean JSON array of objects. Do NOT include markdown codeblocks (no \`\`\`json).

JSON SCHEMA REQUIREMENT:
[
  {
    "id": "persona_1",
    "name": "IndianName (Expert Title)",
    "role": "Brief 1-sentence description of their specialized perspective",
    "mindset": "Generic instruction on what flaws to look out for and how to critique previous outputs"
  }
]`;

  const rawResponse = await callLLM({
    prompt: `User Prompt: "${userPrompt}"\n\nDetermine the optimal specialized personas with friendly Indian names to debate this topic.`,
    systemInstruction,
    provider,
    temperature
  });

  try {
    let cleanJson = rawResponse.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    const personas = JSON.parse(cleanJson);
    if (!Array.isArray(personas) || personas.length < 3) {
      throw new Error('Invalid persona array returned from LLM');
    }
    return personas;
  } catch (err) {
    console.warn('Falling back to default Indian personas:', err.message);
    return existingPersonas.length > 0 ? existingPersonas : [
      {
        id: 'arjun_tech_lead',
        name: 'Arjun (Technical Lead)',
        role: 'Focuses on architecture, code quality, and technical scalability.',
        mindset: 'Identify architectural flaws and premature optimizations in previous proposals.'
      },
      {
        id: 'rohan_junior_dev',
        name: 'Rohan (Junior Developer)',
        role: 'Focuses on simplicity, readability, and ease of implementation.',
        mindset: 'Point out overly complex solutions and suggest simpler code alternatives.'
      },
      {
        id: 'priya_security',
        name: 'Priya (Security Auditor)',
        role: 'Focuses on vulnerability identification, data safety, and edge cases.',
        mindset: 'Critique previous proposals for security holes and privacy flaws.'
      }
    ];
  }
}
