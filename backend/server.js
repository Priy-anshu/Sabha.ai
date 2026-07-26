import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { callLLM } from './services/llmProvider.js';
import { allocatePersonas } from './services/personaAllocator.js';
import { runDebate } from './services/debateEngine.js';
import { runDualVerification } from './services/dualVerifier.js';
import { connectDB } from './config/db.js';
import sessionRoutes from './routes/sessionRoutes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/sessions', sessionRoutes);
app.use('/api/auth', authRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Multi-Agent Debate Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Phase 1 Simple Test Route for LLM Call
app.post('/api/chat/test', async (req, res) => {
  try {
    const { prompt, systemInstruction, provider } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const aiResponse = await callLLM({
      prompt,
      systemInstruction,
      provider
    });

    return res.json({
      success: true,
      provider: provider || process.env.DEFAULT_PROVIDER || 'gemini',
      response: aiResponse
    });
  } catch (error) {
    console.error('API Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while communicating with the AI service'
    });
  }
});

// Phase 2 Route: Step A - Allocate Personas
app.post('/api/chat/allocate-personas', async (req, res) => {
  try {
    const { prompt, provider } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const personas = await allocatePersonas(prompt, provider);
    return res.json({
      success: true,
      prompt,
      count: personas.length,
      personas
    });
  } catch (error) {
    console.error('Persona Allocator Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Phase 3 Route: Step B - Full Multi-Agent Debate Loop
app.post('/api/chat/debate', async (req, res) => {
  try {
    const { prompt, existingPersonas, provider } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Step A: Dynamically allocate/prune personas
    const personas = await allocatePersonas(prompt, existingPersonas, provider);

    // Step B: Run Sequential Adversarial Debate across allocated personas
    const debateResult = await runDebate({
      userPrompt: prompt,
      personas,
      provider
    });

    // Step C: Run Dual-Persona Verification Layer (Fact Auditor + Completeness Auditor)
    let verificationResult = { verified: true, verifiers: [], finalResponse: debateResult.consensus };
    if (personas.length > 1) {
      verificationResult = await runDualVerification({
        userPrompt: prompt,
        debateConsensus: debateResult.consensus,
        provider
      });
    }

    return res.json({
      success: true,
      prompt,
      count: personas.length,
      personas,
      response: verificationResult.finalResponse,
      transcript: debateResult.transcript,
      verification: verificationResult
    });
  } catch (error) {
    console.error('Debate Engine Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`==================================================`);
  console.log(`🚀 Multi-Agent Debate Backend running on port ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`==================================================`);
  await connectDB();
});
