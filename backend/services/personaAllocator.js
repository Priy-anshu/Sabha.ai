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

  // 2. DOMAIN / TECHNICAL QUERY: Perform deep domain analysis & allocate specialized expert personas
  const temperature = detectTemperature(userPrompt);
  const existingNames = existingPersonas.map(p => p.name);

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
