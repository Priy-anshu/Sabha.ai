import { callLLM } from './llmProvider.js';

/**
 * Checks if a user prompt is casual conversation or simple general chat.
 */
function isCasualConversation(prompt) {
  if (!prompt || typeof prompt !== 'string') return false;
  const clean = prompt.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');

  // Any prompt with a question mark or question words is NEVER casual conversation
  const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'can', 'explain', 'tell', 'describe', 'is', 'are', 'should', 'which', 'fix', 'build', 'create', 'write', 'help'];
  const hasQuestionWord = questionWords.some(qw => clean.startsWith(qw + ' ') || clean.includes(' ' + qw + ' ') || clean === qw);
  if (prompt.includes('?') || hasQuestionWord) {
    return false;
  }

  // Exact greetings list
  const exactCasualPhrases = [
    'hi', 'hello', 'hey', 'namaste', 'good morning', 'good evening', 'good afternoon',
    'thanks', 'thank you', 'sup', 'yo', 'nice to meet you'
  ];

  // Only return true if prompt is an EXACT 1-2 word greeting
  return exactCasualPhrases.includes(clean);
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
 * Evaluates whether existing session personas are relevant to a new user prompt.
 * If the topic shifts significantly (e.g. from React/Tech to Shayari/Poetry or Legal/Medical),
 * this function returns FALSE, triggering automatic re-allocation of new domain experts!
 */
function arePersonasRelevantToPrompt(userPrompt, existingPersonas = []) {
  if (!existingPersonas || existingPersonas.length === 0) return false;
  if (!userPrompt || typeof userPrompt !== 'string') return true;

  // Single-persona casual assistant check
  if (existingPersonas.length === 1 && existingPersonas[0].role?.toLowerCase().includes('friendly assistant')) {
    // If prompt is no longer casual, existing friendly assistant is NOT relevant
    return isCasualConversation(userPrompt);
  }

  // If prompt is a casual greeting, keep existing personas for smooth continuation
  if (isCasualConversation(userPrompt)) {
    return true;
  }

  const promptLower = userPrompt.toLowerCase();

  // Define clear domain categories to detect major topic shifts
  const domains = [
    { key: 'tech', words: ['code', 'react', 'javascript', 'node', 'api', 'database', 'sql', 'bug', 'git', 'deploy', 'css', 'html', 'python', 'server', 'docker', 'frontend', 'backend', 'auth', 'system'] },
    { key: 'creative', words: ['shayari', 'poem', 'poetry', 'story', 'song', 'lyrics', 'script', 'rhyme', 'creative', 'novel', 'kavi', 'gazal'] },
    { key: 'business', words: ['marketing', 'sales', 'revenue', 'startup', 'business', 'pricing', 'seo', 'growth', 'finance', 'invest'] },
    { key: 'health', words: ['diet', 'workout', 'exercise', 'health', 'calorie', 'muscle', 'fitness', 'medical', 'doctor'] },
    { key: 'academic', words: ['history', 'science', 'math', 'physics', 'geography', 'philosophy', 'essay'] }
  ];

  // Combine roles/mindsets of existing personas to infer current domain
  const existingText = existingPersonas.map(p => `${p.name} ${p.role} ${p.mindset}`).join(' ').toLowerCase();

  let existingDomain = null;
  let newPromptDomain = null;

  for (const d of domains) {
    if (d.words.some(w => existingText.includes(w))) existingDomain = d.key;
    if (d.words.some(w => promptLower.includes(w))) newPromptDomain = d.key;
  }

  // If both domains are detected and they mismatch (e.g. tech -> creative), personas are NOT relevant!
  if (existingDomain && newPromptDomain && existingDomain !== newPromptDomain) {
    console.log(`🔀 Topic shift detected: ${existingDomain} -> ${newPromptDomain}. Re-allocating personas.`);
    return false;
  }

  return true;
}

/**
 * Step A: Dynamic Persona Allocator Agent (with Session Persona Lock & Intent Routing)
 */
export async function allocatePersonas(inputParam, existingPersonasParam = [], providerParam = 'gemini') {
  let userPrompt = '';
  let existingPersonas = [];
  let provider = 'gemini';
  let behaviors = [];

  if (typeof inputParam === 'object' && inputParam !== null) {
    userPrompt = inputParam.prompt || inputParam.userPrompt || '';
    existingPersonas = inputParam.existingPersonas || [];
    provider = inputParam.provider || 'gemini';
    behaviors = inputParam.behaviors || [];
  } else {
    userPrompt = String(inputParam || '');
    existingPersonas = existingPersonasParam || [];
    provider = providerParam || 'gemini';
  }

  // 1. CASUAL CONVERSATION BYPASS: Re-use existing persona if available and relevant!
  if (isCasualConversation(userPrompt)) {
    if (existingPersonas && existingPersonas.length > 0 && arePersonasRelevantToPrompt(userPrompt, existingPersonas)) {
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

  // Check topic drift: If existing personas are no longer relevant to the new prompt, reset existingPersonas!
  const isPersonaRelevant = arePersonasRelevantToPrompt(userPrompt, existingPersonas);
  const activeExistingPersonas = isPersonaRelevant ? existingPersonas : [];

  // 2. DOMAIN / TECHNICAL QUERY: Perform deep domain analysis & allocate specialized expert personas
  const temperature = detectTemperature(userPrompt);
  const existingNames = activeExistingPersonas.map(p => p.name);

  const BEHAVIOR_PROMPT_MAP = {
    no_sugarcoating: "Blunt, direct & unfiltered without polite fluff",
    strict: "Strict & rigorous, calling out logical fallacies and edge cases",
    analytical: "Clinical, data-driven, and objective",
    first_principles: "Deconstructs down to fundamental truths",
    devils_advocate: "Actively challenges assumptions and finds hidden risks",
    skeptical: "Questions unproven claims and demands proof",
    edge_case_obsessed: "Obsessed with failure modes and race conditions",
    security_focused: "Prioritizes zero-trust security and data privacy",
    pragmatic: "Pragmatic & minimalist, focusing on simple execution",
    code_purist: "Strict clean code & design pattern adherence",
    concise: "Ultra-concise with short bullet points",
    system_architect: "High-level system scalability focus",
    friendly: "Warm, encouraging, and polite",
    mentor: "Educational with clear analogies",
    socratic: "Uses Socratic guiding questions",
    creative: "Visionary & out-of-the-box brainstorming",
    serious: "Formal executive corporate tone",
    sarcastic: "Witty & sarcastic with dry humor"
  };

  const selectedBehaviorDirectives = Array.isArray(behaviors)
    ? behaviors.map(b => BEHAVIOR_PROMPT_MAP[b]).filter(Boolean).map(d => `- ${d}`).join('\n')
    : '';

  const systemInstruction = `You are the Lead Multi-Agent Council Coordinator for Sabha.ai.
Your mission is to perform deep domain analysis on the user prompt and construct an elite, highly-specialized team of expert personas tailored specifically to solve, critique, and audit this exact topic.

CRITICAL ALLOCATION PROTOCOL (DO NOT HURRY OR USE GENERIC TITLES):
1. DEEP DOMAIN ANALYSIS:
   - Identify the exact technical, creative, or analytical domain (e.g., Distributed Databases, Frontend State Management, Cybersecurity, Financial Fraud, Legal Compliance, Bio-Tech, Creative Writing).
   - Identify hidden edge cases, security risks, scalability bottlenecks, or user experience trade-offs implicit in the request.

2. ADVERSARIAL TEAM COMPOSITION:
   - Moderate complexity ➔ Allocate 3 specialized personas.
   - High complexity / multi-faceted ➔ Allocate 4 or 5 specialized personas.
   - Ensure the team forms a balanced, complementary triad:
     * Primary Domain Architect (Builds the core initial foundation)
     * Adversarial Auditor / Security & Edge-Case Lead (Attacks flaws, race conditions, and edge cases)
     * Pragmatic Operational / UX Specialist (Focuses on real-world execution, simplicity, and performance)

3. SPECIFICITY & HIGH-VALUE NAMING:
   - NEVER use generic titles like "Technical Lead", "Developer", or "Assistant".
   - MUST use sharp, highly specialized titles (e.g., "Kabir (Distributed Systems & Consensus Specialist)", "Ananya (Zero-Trust Security & API Auditor)", "Diya (UI/UX Performance Lead)").
   - Pair each specialist title with a distinct, easily pronounceable Indian name.

4. SHARP, DOMAIN-SPECIFIC MINDSETS:
   - Give each persona a razor-sharp, actionable mindset focused on their exact domain responsibilities.
${selectedBehaviorDirectives ? `\n5. INCORPORATE USER BEHAVIOR DIRECTIVES:\nAll allocated personas MUST embody these behavior traits:\n${selectedBehaviorDirectives}\n` : ''}
6. SESSION PERSISTENCE:
   - If existing personas (${JSON.stringify(existingNames)}) already match the domain topic, PRESERVE their names and adapt their specialized focus without resetting them.

7. OUTPUT FORMAT:
   - Respond ONLY with a valid JSON array of persona objects. No markdown formatting (\`\`\`json).

JSON SCHEMA REQUIREMENT:
[
  {
    "id": "persona_1",
    "name": "IndianName (Highly Specialized Domain Title)",
    "role": "Exact 1-sentence specialization in relation to the user prompt",
    "mindset": "Specific critical instructions on what domain flaws, edge cases, or optimizations to inspect"
  }
]`;

  const rawResponse = await callLLM({
    prompt: `[USER PROMPT TO ANALYZE]:\n"${userPrompt}"\n\n[EXISTING SESSION PERSONAS]:\n${JSON.stringify(existingNames)}\n\nPerform deep domain analysis and allocate the optimal 3, 4, or 5 specialized Indian-named expert personas.`,
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

/**
 * Generates a clean 3 to 4 word topic title for sidebar navigation
 */
export async function generateChatTitle(userPrompt) {
  if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
    return 'New Conversation';
  }

  const cleanPrompt = userPrompt.trim();
  const words = cleanPrompt.split(/\s+/);
  if (words.length <= 4) {
    return words.join(' ').replace(/[^a-zA-Z0-9\s]/g, '');
  }

  try {
    const rawTitle = await callLLM({
      prompt: `[USER PROMPT]: "${cleanPrompt}"\n\nGenerate a clean, concise 3 to 4 word title for this chat topic. Return ONLY the 3-4 word title text without any quotes or markdown punctuation.`,
      systemInstruction: 'You are a chat topic title generator. Output clean, concise 3 to 4 word titles.',
      temperature: 0.3
    });

    let cleanTitle = rawTitle.trim().replace(/^["']|["']$/g, '').replace(/[\n\r]/g, '');
    if (cleanTitle.endsWith('.')) cleanTitle = cleanTitle.slice(0, -1);

    return cleanTitle || words.slice(0, 4).join(' ');
  } catch (err) {
    return words.slice(0, 4).join(' ');
  }
}
