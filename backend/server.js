import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { callLLM } from './services/llmProvider.js';
import { allocatePersonas } from './services/personaAllocator.js';
import { runDebate } from './services/debateEngine.js';
import { runDualVerification } from './services/dualVerifier.js';
import { extractTextFromFile, chunkText, retrieveRelevantContext } from './services/ragService.js';
import { connectDB } from './config/db.js';
import sessionRoutes from './routes/sessionRoutes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Multer memory storage for file uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/sessions', sessionRoutes);
app.use('/api/auth', authRoutes);

// Connect Database
connectDB();

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Multi-Agent Debate Backend with RAG is running' });
});

// POST /api/chat/allocate-personas - Step A: Persona Allocator
app.post('/api/chat/allocate-personas', async (req, res) => {
  try {
    const { prompt, existingPersonas } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const allocation = await allocatePersonas({ prompt, existingPersonas });
    return res.json({ success: true, ...allocation });
  } catch (error) {
    console.error('Persona Allocation Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/chat/debate - Full Pipeline: Allocator -> RAG Extraction -> Debate -> Dual Verifier
app.post('/api/chat/debate', upload.single('file'), async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const provider = req.body.provider || 'gemini';
    const existingPersonas = req.body.existingPersonas ? JSON.parse(req.body.existingPersonas) : [];

    if (!prompt && !req.file) {
      return res.status(400).json({ success: false, error: 'Prompt or document file is required' });
    }

    // Step RAG: If document attached, extract text & retrieve context
    let documentContext = '';
    let attachedFileName = '';
    if (req.file) {
      attachedFileName = req.file.originalname;
      console.log(`📄 Processing attached file: ${attachedFileName}`);
      const rawText = await extractTextFromFile(req.file);
      const chunks = chunkText(rawText);
      documentContext = retrieveRelevantContext(chunks, prompt || 'Summary', rawText);
    }

    const finalPrompt = prompt || `Summarize and analyze attached document: ${attachedFileName}`;

    // Step A: Allocate personas
    const allocation = await allocatePersonas({ prompt: finalPrompt, existingPersonas });
    const personas = allocation.personas;

    // Step B: Run Sequential Adversarial Debate with RAG context
    const debateResult = await runDebate({
      userPrompt: finalPrompt,
      personas,
      provider,
      documentContext
    });

    // Step C: Run Dual-Persona Verification Layer
    let verificationResult = { verified: true, verifiers: [], finalResponse: debateResult.consensus };
    if (personas.length > 1) {
      verificationResult = await runDualVerification({
        userPrompt: finalPrompt,
        debateConsensus: debateResult.consensus,
        provider
      });
    }

    return res.json({
      success: true,
      prompt: finalPrompt,
      attachedFileName,
      count: personas.length,
      personas,
      response: verificationResult.finalResponse,
      transcript: debateResult.transcript,
      verification: verificationResult
    });
  } catch (error) {
    console.error('Debate Engine Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Multi-Agent Debate Backend with RAG running on port ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`==================================================`);
});
