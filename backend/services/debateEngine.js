import { callLLM } from './llmProvider.js';

const BEHAVIOR_PROMPT_MAP = {
  no_sugarcoating: "Be blunt, direct, and unfiltered. Avoid polite fluff, filler text, pleasantries, or ego validation.",
  strict: "Enforce strict, rigorous standards. Call out logical fallacies, edge cases, and weak assumptions immediately.",
  analytical: "Be clinical, data-driven, and objective. Rely on evidence, logical metrics, and clear structured breakdowns.",
  first_principles: "Deconstruct problems down to fundamental truths and build up solutions from first principles.",
  devils_advocate: "Actively play Devil's Advocate. Challenge assumptions, seek out hidden vulnerabilities, and focus on worst-case scenarios.",
  skeptical: "Be skeptical. Question every unproven assumption and demand concrete proof or justification.",
  edge_case_obsessed: "Be obsessed with edge cases. Focus heavily on failure modes, race conditions, and boundary limits.",
  security_focused: "Prioritize security, data privacy, encryption, and zero-trust principles above all else.",
  pragmatic: "Be pragmatic and minimalist. Focus on realistic, simple execution without over-engineering or unnecessary complexity.",
  code_purist: "Be a strict code purist. Adhere strictly to clean code principles, DRY, SOLID, and proven design patterns.",
  concise: "Be ultra-concise. Use short, punchy bullet points and cut out unnecessary wordiness.",
  system_architect: "Think like a Principal System Architect. Focus on high-level system boundaries, trade-offs, and scalability.",
  friendly: "Be warm, friendly, polite, and encouraging.",
  mentor: "Act as a patient mentor/teacher. Explain concepts clearly step-by-step using intuitive analogies.",
  socratic: "Use the Socratic method. Guide the user by posing thoughtful counter-questions that stimulate deeper insight.",
  creative: "Be visionary and highly creative. Brainstorm innovative, out-of-the-box ideas and novel approaches.",
  serious: "Maintain a formal, serious, executive corporate tone suitable for C-level presentation.",
  sarcastic: "Use subtle dry humor, wit, and sarcasm while still providing technically precise and accurate information."
};

function buildBehaviorPrompt(behaviors = []) {
  if (!behaviors || !Array.isArray(behaviors) || behaviors.length === 0) return '';
  const directives = behaviors.map(b => BEHAVIOR_PROMPT_MAP[b]).filter(Boolean);
  if (directives.length === 0) return '';
  return `\n\nUSER-SPECIFIED BEHAVIOR & TONAL DIRECTIVES:\n` + directives.map(d => `- ${d}`).join('\n');
}

/**
 * Step B: Sequential Adversarial Debate Loop with RAG Document Context Support & Behavior Directives
 */
export async function runDebate({ userPrompt, personas, provider = 'gemini', documentContext = '', behaviors = [] }) {
  if (!personas || personas.length === 0) {
    throw new Error('No personas provided for debate');
  }

  const behaviorDirectives = buildBehaviorPrompt(behaviors);

  // Build Document Augmented Prompt
  const contextAugmentedPrompt = documentContext
    ? `[ATTACHED DOCUMENT CONTEXT (Full Content)]:\n${documentContext}\n\n[USER QUESTION]:\n${userPrompt}`
    : userPrompt;

  // Handle single-persona casual chat bypass
  if (personas.length === 1) {
    const singlePersona = personas[0];
    const systemPrompt = `You are ${singlePersona.name}, acting in the role of ${singlePersona.role}.
Mindset: ${singlePersona.mindset}.${behaviorDirectives}
Use any attached document context if provided to answer the user warmly and accurately. Use markdown bullet points (- ) for sub-items.`;

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
  const MAX_ROUNDS = 3;
  let consensusReached = false;
  let currentProposal = '';
  let finalRoundReached = 1;

  const persona1 = personas[0];

  // 🔄 3-ROUND CONSENSUS LOOP
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    finalRoundReached = round;
    console.log(`🗣️ Starting Debate Round ${round}/${MAX_ROUNDS}...`);

    // Step A: Persona 1 Proposes / Refines Solution
    if (round === 1) {
      const p1Instruction = `You are ${persona1.name} (${persona1.role}).
Mindset: ${persona1.mindset}.${behaviorDirectives}
Analyze the user request and attached document context (if provided). Propose your initial technical/analytical solution. Use markdown hyphens (- ) for sub-item bullet lists under subheadings.`;

      currentProposal = await callLLM({
        prompt: contextAugmentedPrompt,
        systemInstruction: p1Instruction,
        provider,
        temperature: 0.4
      });

      transcript.push({
        round,
        personaName: persona1.name,
        role: persona1.role,
        output: currentProposal,
        vote: 'PROPOSED'
      });
    } else {
      // In Round 2 & 3: Persona 1 updates the proposal addressing prior critiques
      const p1RefineInstruction = `You are ${persona1.name} (${persona1.role}).
Mindset: ${persona1.mindset}.${behaviorDirectives}
Review the critiques from other personas. Update and refine your proposal to address their concerns, resolve flaws, and achieve consensus. Use markdown hyphens (- ) for bullet lists.`;

      const priorCritiques = transcript.filter(t => t.round === round - 1 && t.personaName !== persona1.name).map(t => `${t.personaName}: ${t.output}`).join('\n\n');
      currentProposal = await callLLM({
        prompt: `${contextAugmentedPrompt}\n\n[Prior Proposal]:\n${currentProposal}\n\n[Critiques to Address]:\n${priorCritiques}\n\nProvide your Refined Proposal addressing all feedback:`,
        systemInstruction: p1RefineInstruction,
        provider,
        temperature: 0.4
      });

      transcript.push({
        round,
        personaName: persona1.name,
        role: persona1.role,
        output: `[Refined Proposal - Round ${round}]:\n${currentProposal}`,
        vote: 'REFINED'
      });
    }

    // Step B: Remaining Personas Review & Cast Vote (AGREED or DISAGREED)
    let roundDissenters = 0;
    for (let i = 1; i < personas.length; i++) {
      const p = personas[i];
      const critiqueInstruction = `You are ${p.name} (${p.role}).
Mindset: ${p.mindset}.${behaviorDirectives}

CONSENSUS REVIEW & CRITIQUE INSTRUCTIONS:
Evaluate the latest proposal by ${persona1.name}.
At the VERY FIRST LINE of your response, write your explicit status:
- Write "STATUS: AGREED" if the proposal satisfactorily addresses all major technical, security, and performance concerns.
- Write "STATUS: DISAGREED" if critical flaws, missing edge cases, or unhandled risks remain.

Below the status line, provide your concise feedback (100-150 words) using markdown hyphens (- ) for bullet lists.`;

      const deltaOutput = await callLLM({
        prompt: `${contextAugmentedPrompt}\n\n[Current Refined Proposal by ${persona1.name}]:\n${currentProposal}\n\nReview and provide your STATUS (AGREED or DISAGREED) and concise feedback:`,
        systemInstruction: critiqueInstruction,
        provider,
        temperature: 0.4
      });

      const isAgreed = deltaOutput.includes('STATUS: AGREED');
      if (!isAgreed) roundDissenters++;

      transcript.push({
        round,
        personaName: p.name,
        role: p.role,
        output: deltaOutput,
        vote: isAgreed ? 'AGREED' : 'DISAGREED'
      });
    }

    // Check if Unanimous Agreement was reached in this round
    if (roundDissenters === 0) {
      console.log(`🎉 Unanimous Consensus reached by all personas in Round ${round}!`);
      consensusReached = true;
      break;
    }
  }

  // ⚖️ FALLBACK VOTING & TIE-BREAKER LOOP (If still not unanimous after 3 Rounds)
  let votingSummary = '';
  if (!consensusReached) {
    console.log('⚖️ Unanimous agreement not reached after 3 rounds. Triggering Fallback Majority Voting Loop...');

    const votes = [];
    for (const p of personas) {
      const voteInstruction = `You are ${p.name} (${p.role}).
Mindset: ${p.mindset}.${behaviorDirectives}
The council has completed 3 rounds of debate. Cast your final vote on the core solution.
State: "FINAL VOTE: APPROVE" or "FINAL VOTE: APPROVE WITH CONDITIONS" or "FINAL VOTE: DISSENT".
List 1 key reason for your vote.`;

      const voteOutput = await callLLM({
        prompt: `${contextAugmentedPrompt}\n\n[Final Proposal]:\n${currentProposal}\n\nCast your final vote and 1-sentence rationale:`,
        systemInstruction: voteInstruction,
        provider,
        temperature: 0.3
      });

      votes.push(`${p.name} (${p.role}): ${voteOutput}`);
    }
    votingSummary = `\n\nFALLBACK MAJORITY VOTING SUMMARY:\n${votes.join('\n')}`;
  }

  // Step 4: Final Master Synthesizer Agent
  const synthesizerInstruction = `You are the Lead Synthesis Master Agent.
${consensusReached ? 'Unanimous consensus was achieved by all council personas.' : 'A 3-round debate concluded with a majority vote decision.'}
Synthesize the final proposal, persona critiques, and voting results into a single, unified, well-structured answer.${behaviorDirectives}

STRICT MARKDOWN BULLET FORMATTING RULES:
1. Every sub-item, test case, sub-heading point, or key principle MUST start with a markdown hyphen and space ("- ").
   Example:
   ### How to Test It:
   - **The Test of Adversity:** Does their character hold up when things fall apart...
   - **The Principle of Anonymity:** Would they still strive for virtue...
   - **The Legacy of Contribution:** Do they elevate human dignity...

2. NEVER output key-value items as un-bulleted plain lines under subheadings. Every sub-item MUST start with "- ".
3. Do NOT mention verifier names in the final output.`;

  const finalConsensus = await callLLM({
    prompt: `${contextAugmentedPrompt}\n\n[Final Proposal]:\n${currentProposal}\n\n[Debate Transcript Across ${finalRoundReached} Rounds]:\n${transcript.map(t => `Round ${t.round} - ${t.personaName} (${t.vote}): ${t.output}`).join('\n\n')}${votingSummary}\n\nSynthesize the final answer:`,
    systemInstruction: synthesizerInstruction,
    provider,
    temperature: 0.3
  });

  return {
    consensus: finalConsensus,
    transcript
  };
}
