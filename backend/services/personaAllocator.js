import { callLLM } from './llmProvider.js';

/**
 * Checks if a user prompt is casual conversation or simple general chat.
 */
function isCasualConversation(prompt) {
  if (!prompt || typeof prompt !== 'string') return false;
  const clean = prompt.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');

  const casualPhrases = [
    'hi', 'hello', 'hey', 'namaste', 'good morning', 'good evening',
    'thanks', 'thank you', 'how are you', 'how are you doing', 'how is it going',
    'who are you', 'what can you do', 'sup', 'yo', 'nice to meet you', 'am fine', 'i am fine', 'im fine'
  ];

  const isCasualPhrase = casualPhrases.some(phrase => clean.includes(phrase));
  const technicalKeywords = ['code', 'build', 'project', 'app', 'system', 'tech', 'react', 'api', 'database', 'security', 'story', 'design', 'market'];
  const hasTechKeywords = technicalKeywords.some(kw => clean.includes(kw));

  return (isCasualPhrase || clean.length <= 15) && !hasTechKeywords;
}

/**
 * Detects if a prompt is creative or technical to scale temperature accordingly.
 */
function detectTemperature(prompt) {
  if (!prompt || typeof prompt !== 'string') return 0.3;
  const creativeKeywords = ['story', 'poem', 'script', 'creative', 'brainstorm', 'novel', 'plot', 'character', 'song', 'essay'];
  const isCreative = creativeKeywords.some(kw => prompt.toLowerCase().includes(kw));
  return isCreative ? 0.95 : 0.3;
}

/**
 * Pool of diverse, easily pronounceable Indian names.
 */
const INDIAN_NAMES_POOL = [
  'Aarav', 'Ananya', 'Kabir', 'Diya', 'Rohan', 'Priya', 'Aditya', 'Meera',
  'Vikram', 'Sneha', 'Rahul', 'Tanvi', 'Ishaan', 'Kavya', 'Samar', 'Neha'
];

function getRandomIndianName(usedNames = []) {
  const available = INDIAN_NAMES_POOL.filter(n => !usedNames.includes(n));
  const pool = available.length > 0 ? available : INDIAN_NAMES_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Step A: Dynamic Persona Allocator Agent (with Session Persona Lock & Intent Routing)
 */
export async function allocatePersonas(inputParam, existingPersonasParam = [], providerParam = 'gemini') {
  let userPrompt = '';
  let existingPersonas = [];
  let provider = 'gemini';

  if (typeof inputParam === 'object' && inputParam !== null) {
    userPrompt = inputParam.prompt || inputParam.userPrompt || '';
    existingPersonas = inputParam.existingPersonas || [];
    provider = inputParam.provider || 'gemini';
  } else {
    userPrompt = String(inputParam || '');
    existingPersonas = existingPersonasParam || [];
    provider = providerParam || 'gemini';
  }

  // 1. CASUAL CONVERSATION BYPASS: Re-use existing persona if available!
  if (isCasualConversation(userPrompt)) {
    if (existingPersonas && existingPersonas.length > 0) {
      return { personas: existingPersonas, count: existingPersonas.length, temperature: 0.7 };
    }

    const greetingName = getRandomIndianName();
    const casualPersonas = [
      {
        id: 'communicator',
        name: `${greetingName} (Friendly Assistant)`,
        role: 'Friendly Assistant',
        mindset: 'Respond warmly, clearly, and concisely in 1-2 sentences without technical jargon.'
      }
    ];

    return { personas: casualPersonas, count: 1, temperature: 0.7 };
  }

  // 2. DOMAIN / TECHNICAL QUERY: If existing team fits topic, re-use it. Otherwise allocate/adapt personas.
  const temperature = detectTemperature(userPrompt);
  const existingNames = existingPersonas.map(p => p.name);

  const systemInstruction = `You are an expert AI Multi-Agent System Coordinator.
Your task is to analyze the user prompt and determine specialized expert personas best suited to solve it.

DYNAMIC PERSONA NUMBER SCALING:
- Moderate complexity ➔ Allocate 3 personas.
- High complexity / multi-faceted ➔ Allocate 4 or 5 personas.

RULES:
1. SESSION PERSISTENCE: If the existing personas (${JSON.stringify(existingNames)}) already cover the topic, RETURN THE SAME PERSONAS without changing their names.
2. ADAPTATION: Only add a new persona if a completely new domain is introduced. Only remove a persona if the topic simplified.
3. NAMING: Assign diverse Indian human names paired with titles (e.g. "Kabir (System Architect)", "Ananya (UX Designer)", "Aarav (Security Auditor)").
4. Mindset instructions must be generic (e.g. "Critique the previous solution for flaws and suggest new improvements").
5. Respond ONLY with a valid JSON array of objects. No markdown formatting (\`\`\`json).

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
    prompt: `User Prompt: "${userPrompt}"\nExisting Personas: ${JSON.stringify(existingNames)}\n\nAnalyze topic and allocate 3, 4, or 5 specialized personas with distinct Indian names.`,
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
    if (!Array.isArray(personas) || personas.length === 0) {
      throw new Error('Invalid persona array returned from LLM');
    }
    return { personas, count: personas.length, temperature };
  } catch (err) {
    console.warn('Falling back to default Indian personas:', err.message);
    if (existingPersonas.length > 0) return { personas: existingPersonas, count: existingPersonas.length, temperature };

    const n1 = getRandomIndianName();
    const n2 = getRandomIndianName([n1]);
    const n3 = getRandomIndianName([n1, n2]);

    const defaultPersonas = [
      {
        id: 'tech_lead',
        name: `${n1} (Technical Lead)`,
        role: 'Focuses on architecture, code quality, and technical scalability.',
        mindset: 'Identify architectural flaws and premature optimizations in previous proposals.'
      },
      {
        id: 'junior_dev',
        name: `${n2} (Junior Developer)`,
        role: 'Focuses on simplicity, readability, and ease of implementation.',
        mindset: 'Point out overly complex solutions and suggest simpler code alternatives.'
      },
      {
        id: 'security_auditor',
        name: `${n3} (Security Auditor)`,
        role: 'Focuses on vulnerability identification, data safety, and edge cases.',
        mindset: 'Critique previous proposals for security holes and privacy flaws.'
      }
    ];

    return { personas: defaultPersonas, count: 3, temperature };
  }
}
