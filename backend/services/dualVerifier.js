import { callLLM } from './llmProvider.js';

/**
 * Step C: Dual-Persona Verification Layer
 * Passes the synthesized debate output through 2 specialized verifiers:
 * 1. Kavya (Fact & Error Auditor)
 * 2. Ishaan (Completeness & Clarity Auditor)
 *
 * Returns audit status, verifier notes, and the final audited output.
 */
export async function runDualVerification({ userPrompt, debateConsensus, provider = 'gemini' }) {
  // 1. Verifier 1: Fact & Error Auditor
  const factAuditorInstruction = `You are Kavya (Fact & Error Auditor).
Your job is to audit a proposed AI answer against a user prompt for:
- Hallucinated facts or incorrect technical claims
- Logical inconsistencies or code bugs
- Dangerous or misleading advice

If the answer is completely clean, state "STATUS: APPROVED".
If flaws exist, point out the exact errors and provide the corrected facts.`;

  const factAuditResult = await callLLM({
    prompt: `User Prompt: "${userPrompt}"\n\nProposed Answer to Audit:\n${debateConsensus}\n\nPerform Fact & Error Audit:`,
    systemInstruction: factAuditorInstruction,
    provider,
    temperature: 0.2
  });

  // 2. Verifier 2: Completeness & Clarity Auditor
  const completenessAuditorInstruction = `You are Ishaan (Completeness & Clarity Auditor).
Your job is to audit a proposed AI answer against a user prompt for:
- Missing user requirements (did it answer ALL parts of the user question?)
- Clarity, formatting, and ease of understanding
- Unnecessary fluff or overly long answers

If the answer is completely clean, state "STATUS: APPROVED".
If missing details exist, list what was missed and how to improve it.`;

  const completenessAuditResult = await callLLM({
    prompt: `User Prompt: "${userPrompt}"\n\nProposed Answer to Audit:\n${debateConsensus}\n\nPerform Completeness & Clarity Audit:`,
    systemInstruction: completenessAuditorInstruction,
    provider,
    temperature: 0.2
  });

  // Check if both verifiers approved
  const factApproved = factAuditResult.includes('APPROVED');
  const completenessApproved = completenessAuditResult.includes('APPROVED');

  let finalVerifiedOutput = debateConsensus;

  // 3. If any verifier flagged issues, run a final Refinement Agent
  if (!factApproved || !completenessApproved) {
    console.log('🔍 Dual Verifiers flagged refinements. Producing final audited response...');

    const refinerInstruction = `You are the Lead Quality Assurance Refiner.
Your job is to take an initial proposed answer and refine it using feedback from 2 Dual Verifiers:
1. Fact Auditor Feedback: ${factAuditResult}
2. Completeness Auditor Feedback: ${completenessAuditResult}

Produce the final, flawless, polished response for the user. Do NOT mention verifier names in your output.`;

    finalVerifiedOutput = await callLLM({
      prompt: `User Prompt: "${userPrompt}"\nInitial Answer: ${debateConsensus}\n\nProduce the final audited & polished response:`,
      systemInstruction: refinerInstruction,
      provider,
      temperature: 0.3
    });
  }

  return {
    verified: factApproved && completenessApproved,
    verifiers: [
      {
        name: 'Kavya (Fact & Error Auditor)',
        status: factApproved ? 'Approved' : 'Refinement Applied',
        notes: factAuditResult
      },
      {
        name: 'Ishaan (Completeness Auditor)',
        status: completenessApproved ? 'Approved' : 'Refinement Applied',
        notes: completenessAuditResult
      }
    ],
    finalResponse: finalVerifiedOutput
  };
}
