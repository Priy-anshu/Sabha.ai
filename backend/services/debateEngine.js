import { callLLM } from './llmProvider.js';

/**
 * Step B: Sequential Adversarial Debate Engine
 * Executes a sequential multi-turn debate loop across allocated personas.
 */
export async function runDebate({ userPrompt, personas, provider = 'gemini' }) {
  if (!personas || personas.length === 0) {
    throw new Error('No personas provided for debate execution');
  }

  // 1. Single Persona Bypass (Casual Conversation / Simple Chat)
  if (personas.length === 1) {
    const singlePersona = personas[0];
    const response = await callLLM({
      prompt: userPrompt,
      systemInstruction: `You are ${singlePersona.name}. Role: ${singlePersona.role}.
CRITICAL INSTRUCTION: Respond simply, warmly, and concisely in 1-2 natural sentences. Do NOT generate complex technical analysis, debate, or bullet points for simple casual conversation.`,
      provider,
      temperature: 0.7
    });

    return {
      consensus: response,
      transcript: [
        {
          personaName: singlePersona.name,
          role: singlePersona.role,
          output: response
        }
      ]
    };
  }

  // 2. Sequential Multi-Turn Debate Loop (Only for Domain/Technical Queries)
  const debateTranscript = [];
  let accumulatedContext = '';

  for (let i = 0; i < personas.length; i++) {
    const p = personas[i];
    const isFirst = i === 0;

    const personaInstruction = `You are ${p.name}. Role: ${p.role}.
CRITICAL INSTRUCTION: ${p.mindset}
Assume previous outputs may contain mistakes, missed edge cases, or over-engineering. Point out flaws constructively and offer concrete improvements.`;

    const userContextPrompt = isFirst
      ? `User Question: "${userPrompt}"\n\nProvide your initial specialized solution.`
      : `User Question: "${userPrompt}"\n\nPrevious Debate Transcript:\n${accumulatedContext}\n\nCritique the previous proposals for errors or missed facts, and provide your improved, refined proposal.`;

    console.log(`💬 Running Debate Round ${i + 1}/${personas.length} with Persona: ${p.name}...`);

    const personaOutput = await callLLM({
      prompt: userContextPrompt,
      systemInstruction: personaInstruction,
      provider,
      temperature: 0.5
    });

    debateTranscript.push({
      personaId: p.id,
      personaName: p.name,
      role: p.role,
      output: personaOutput
    });

    accumulatedContext += `\n--- [${p.name}'s Contribution] ---\n${personaOutput}\n`;
  }

  // 3. Final Consensus Synthesizer Step
  console.log(`🤝 Synthesizing Debate Consensus across ${personas.length} personas...`);
  const synthesisInstruction = `You are the Lead Master Synthesizer.
Your job is to read a multi-persona debate transcript and unify all valid critiques, security checks, and improvements into a single, cohesive, authoritative answer for the user.

Do NOT mention persona names like "Rohan said" or "Priya pointed out". Present the final result cleanly and comprehensively.`;

  const finalConsensus = await callLLM({
    prompt: `User Question: "${userPrompt}"\n\nComplete Multi-Agent Debate Transcript:\n${accumulatedContext}\n\nSynthesize the final authoritative answer:`,
    systemInstruction: synthesisInstruction,
    provider,
    temperature: 0.3
  });

  return {
    consensus: finalConsensus,
    transcript: debateTranscript
  };
}
