import { callLLM } from './llmProvider.js';

/**
 * Step B: Sequential Adversarial Debate Loop with RAG Document Context Support
 */
export async function runDebate({ userPrompt, personas, provider = 'gemini', documentContext = '' }) {
  if (!personas || personas.length === 0) {
    throw new Error('No personas provided for debate');
  }

  // Build Document Augmented Prompt
  const contextAugmentedPrompt = documentContext
    ? `[ATTACHED DOCUMENT CONTEXT (Full Content)]:\n${documentContext}\n\n[USER QUESTION]:\n${userPrompt}`
    : userPrompt;

  // Handle single-persona casual chat bypass
  if (personas.length === 1) {
    const singlePersona = personas[0];
    const systemPrompt = `You are ${singlePersona.name}, acting in the role of ${singlePersona.role}.
Mindset: ${singlePersona.mindset}.
Use any attached document context if provided to answer the user warmly and accurately.`;

    const singleResponse = await callLLM({
      prompt: contextAugmentedPrompt,
      systemInstruction: systemPrompt,
      provider,
      temperature: 0.7
    });

    return {
      consensus: singleResponse,
      transcript: [{ personaName: singlePersona.name, role: singlePersona.role, output: singleResponse }]
    };
  }

  const transcript = [];
  let currentProposal = '';

  // Step 2: Persona 1 proposes initial solution
  const persona1 = personas[0];
  const p1Instruction = `You are ${persona1.name} (${persona1.role}).
Mindset: ${persona1.mindset}.
Analyze the user request and the attached document context (if provided) and propose your initial technical/analytical solution.`;

  currentProposal = await callLLM({
    prompt: contextAugmentedPrompt,
    systemInstruction: p1Instruction,
    provider,
    temperature: 0.4
  });

  transcript.push({
    personaName: persona1.name,
    role: persona1.role,
    output: currentProposal
  });

  // Step 3: Sequential debate loop across remaining personas
  for (let i = 1; i < personas.length; i++) {
    const p = personas[i];
    const critiqueInstruction = `You are ${p.name} (${p.role}).
Mindset: ${p.mindset}.
Review the user query, attached document context, and previous solution. Critique the previous solution for flaws, security issues, performance bottlenecks, or unhandled edge cases. Present your refined version.`;

    const nextOutput = await callLLM({
      prompt: `${contextAugmentedPrompt}\n\nPrevious Solution by ${personas[i - 1].name}:\n${currentProposal}\n\nProvide your critique and refined proposal:`,
      systemInstruction: critiqueInstruction,
      provider,
      temperature: 0.4
    });

    currentProposal = nextOutput;
    transcript.push({
      personaName: p.name,
      role: p.role,
      output: nextOutput
    });
  }

  // Step 4: Final Master Synthesizer Agent
  const synthesizerInstruction = `You are the Lead Synthesis Master Agent.
Synthesize all persona proposals, critiques, and attached document context into a unified, flawless, well-structured final answer. Do NOT mention verifier names in the output.`;

  const finalConsensus = await callLLM({
    prompt: `${contextAugmentedPrompt}\n\nDebate Transcript:\n${transcript.map(t => `${t.personaName}: ${t.output}`).join('\n\n')}\n\nSynthesize the final answer:`,
    systemInstruction: synthesizerInstruction,
    provider,
    temperature: 0.3
  });

  return {
    consensus: finalConsensus,
    transcript
  };
}
