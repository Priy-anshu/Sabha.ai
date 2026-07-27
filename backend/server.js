import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { callLLM } from './services/llmProvider.js';
import { allocatePersonas } from './services/personaAllocator.js';
import { runDebate } from './services/debateEngine.js';
import { runDualVerification } from './services/dualVerifier.js';
import { extractTextFromFile, chunkText, retrieveRelevantContext, generateEmbeddingsForChunks } from './services/ragService.js';
import { connectDB } from './config/db.js';
import sessionRoutes from './routes/sessionRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { protect } from './middleware/authMiddleware.js';
import { ChatDocs } from './models/ChatDocs.js';

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
  res.json({ status: 'ok', message: 'Sabha.ai Backend with RAG is running' });
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

// POST /api/chat/debate - Full Pipeline with Auth Protection for File Attachments
app.post('/api/chat/debate', protect, upload.single('file'), async (req, res) => {
  try {
    const prompt = (req.body.prompt || '').trim();
    const provider = req.body.provider || 'gemini';
    const existingPersonas = req.body.existingPersonas ? JSON.parse(req.body.existingPersonas) : [];
    const behaviors = req.body.behaviors ? JSON.parse(req.body.behaviors) : [];
    const sessionId = req.body.sessionId || 'sess_default';
    const isGuestUser = !req.user || req.user.userId === 'guest_user_101';

    // ENFORCE AUTH FOR FILE ATTACHMENTS: Guests can only send text prompts
    if (req.file && isGuestUser) {
      return res.status(401).json({
        success: false,
        error: 'Document upload requires a signed-in account. Please Sign In or Register to upload files.'
      });
    }

    if (!prompt && !req.file) {
      return res.status(400).json({ success: false, error: 'Prompt or document file is required' });
    }

    let documentContext = '';
    let attachedFileName = '';

    // Step RAG 1: If user is logged in & attached a file
    if (req.file && !isGuestUser) {
      attachedFileName = req.file.originalname;
      console.log(`📄 Processing attached file for user ${req.user.email}: ${attachedFileName}`);
      const rawText = await extractTextFromFile(req.file);
      const chunks = chunkText(rawText);
      const embeddings = await generateEmbeddingsForChunks(chunks);

      // Save document into ChatDocs model
      const docId = 'doc_' + Date.now();
      await ChatDocs.create({
        docId,
        sessionId,
        fileName: attachedFileName,
        mimeType: req.file.mimetype,
        rawText,
        chunks,
        embeddings
      });

      documentContext = await retrieveRelevantContext(chunks, prompt || 'Summary', rawText, embeddings);
    } else if (sessionId && !isGuestUser) {
      // Step RAG 2: Check ChatDocs memory for logged-in user
      const existingDocs = await ChatDocs.find({ sessionId }).sort({ uploadedAt: -1 });
      if (existingDocs && existingDocs.length > 0) {
        const latestDoc = existingDocs[0];
        attachedFileName = latestDoc.fileName;
        console.log(`🧠 Reusing stored ChatDoc memory for session ${sessionId}: ${attachedFileName}`);
        documentContext = await retrieveRelevantContext(latestDoc.chunks, prompt, latestDoc.rawText, latestDoc.embeddings);
      }
    }

    const finalPrompt = prompt || `Summarize and analyze attached document: ${attachedFileName}`;

    // Step A: Allocate personas
    const allocation = await allocatePersonas({ prompt: finalPrompt, existingPersonas, behaviors });
    const personas = allocation.personas;

    // Step B: Run Sequential Adversarial Debate with RAG context & User Behavior Directives
    const debateResult = await runDebate({
      userPrompt: finalPrompt,
      personas,
      provider,
      documentContext,
      behaviors
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
  console.log(`🚀 Sabha.ai Backend with RAG running on port ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`==================================================`);
});
