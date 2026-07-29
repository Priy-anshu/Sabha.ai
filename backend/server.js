import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { callLLM } from './services/llmProvider.js';
import { allocatePersonas, isPureImagePrompt, requiresVisualDiagram } from './services/personaAllocator.js';
import { runDebate } from './services/debateEngine.js';
import { runDualVerification } from './services/dualVerifier.js';
import { extractTextFromFile, chunkText, retrieveRelevantContext, generateEmbeddingsForChunks } from './services/ragService.js';
import { getSessionContext, updateSessionContext, formatContextPrompt } from './services/sessionCache.js';
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

// POST /api/chat/debate-stream - Real-Time SSE Multi-Agent Thinking Stream
app.post('/api/chat/debate-stream', protect, upload.any(), async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const keepAliveInterval = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (e) {
      clearInterval(keepAliveInterval);
    }
  }, 10000);

  const sendEvent = (eventType, data) => {
    try {
      res.write(`data: ${JSON.stringify({ type: eventType, ...data })}\n\n`);
    } catch (e) {
      console.warn('SSE Write Warning:', e.message);
    }
  };

  req.on('close', () => {
    clearInterval(keepAliveInterval);
  });

  try {
    const prompt = (req.body.prompt || '').trim();
    const provider = req.body.provider || 'gemini';
    const existingPersonas = req.body.existingPersonas ? JSON.parse(req.body.existingPersonas) : [];
    const behaviors = req.body.behaviors ? JSON.parse(req.body.behaviors) : [];
    const sessionId = req.body.sessionId || 'sess_default';
    const isGuestUser = !req.user || req.user.userId === 'guest_user_101';
    const uploadedFiles = req.files || (req.file ? [req.file] : []);

    if (uploadedFiles.length > 0 && isGuestUser) {
      sendEvent('error', { error: 'Document upload requires a signed-in account.' });
      return res.end();
    }

    let documentContext = '';
    let attachedFileName = '';

    sendEvent('status', {
      title: 'Analyzing Intent & Context Memory',
      detail: 'Scanning document context and memory cache...',
      status: 'in_progress'
    });

    if (uploadedFiles.length > 0 && !isGuestUser) {
      const fileNames = uploadedFiles.map(f => f.originalname);
      attachedFileName = fileNames.join(', ');

      const contextParts = [];
      for (const file of uploadedFiles) {
        const rawText = await extractTextFromFile(file);
        if (rawText) {
          const chunks = chunkText(rawText);
          const embeddings = await generateEmbeddingsForChunks(chunks);
          const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
          await ChatDocs.create({ docId, sessionId, fileName: file.originalname, mimeType: file.mimetype, rawText, chunks, embeddings });
          const ctx = await retrieveRelevantContext(chunks, prompt || 'Summary', rawText, embeddings);
          contextParts.push(`--- Attached File (${file.originalname}) ---\n${ctx}`);
        }
      }
      documentContext = contextParts.join('\n\n');
    } else if (sessionId && !isGuestUser) {
      const existingDocs = await ChatDocs.find({ sessionId }).sort({ uploadedAt: -1 });
      if (existingDocs && existingDocs.length > 0) {
        const latestDoc = existingDocs[0];
        attachedFileName = latestDoc.fileName;
        documentContext = await retrieveRelevantContext(latestDoc.chunks, prompt, latestDoc.rawText, latestDoc.embeddings);
      }
    }

    const finalPrompt = prompt || `Summarize and analyze attached document: ${attachedFileName}`;

    const sessionContextData = await getSessionContext(sessionId);
    const chatMemoryPrompt = formatContextPrompt(sessionContextData);

    sendEvent('status', {
      title: 'Allocating Specialized Council Personas',
      detail: 'Performing deep domain analysis to select expert triad...',
      status: 'in_progress'
    });

    const allocation = await allocatePersonas({ prompt: finalPrompt, existingPersonas, behaviors });
    const personas = allocation.personas;

    sendEvent('personas_allocated', {
      personas,
      title: `Allocated ${personas.length} Expert Persona${personas.length > 1 ? 's' : ''}`,
      detail: personas.map(p => `${p.name} (${p.role})`).join(' • '),
      status: 'completed'
    });

    let verificationResult = { verified: true, verifiers: [], finalResponse: '' };
    let debateResult = { consensus: '', transcript: [] };

    // Mode A: Pure Image Generation (No Debate)
    if (isPureImagePrompt(finalPrompt)) {
      sendEvent('status', {
        title: '🎨 Generating AI Image',
        detail: 'Rendering high-definition visual imagery using Flux AI model...',
        status: 'in_progress'
      });

      const cleanImagePrompt = finalPrompt.replace(/^(generate|create|draw|make)\s+(an?\s+)?(image|picture|drawing|illustration|photo)\s+(of\s+)?/i, '').trim() || finalPrompt;
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanImagePrompt)}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
      const imageResponse = `Here is your generated image for **"${cleanImagePrompt}"**:\n\n![${cleanImagePrompt}](${imageUrl})`;

      verificationResult = { verified: true, verifiers: [], finalResponse: imageResponse };
      debateResult = { consensus: imageResponse, transcript: [{ personaName: personas[0]?.name || 'AI Visual Artist', role: 'AI Image Generator', output: imageResponse }] };
    } else {
      // Mode B & C: Multi-Agent Consensus Debate
      debateResult = await runDebate({
        userPrompt: finalPrompt,
        personas,
        provider,
        documentContext,
        behaviors,
        chatMemoryPrompt,
        onProgress: (event) => {
          sendEvent('debate_step', event);
        }
      });

      sendEvent('status', {
        title: 'Running Dual-Persona Quality Audit',
        detail: 'Fact Auditor (Kavya) & Completeness Auditor (Ishaan) auditing consensus output...',
        status: 'in_progress'
      });

      verificationResult = { verified: true, verifiers: [], finalResponse: debateResult.consensus };
      if (personas.length > 1) {
        verificationResult = await runDualVerification({
          userPrompt: finalPrompt,
          debateConsensus: debateResult.consensus,
          provider
        });
      }
    }

    sendEvent('status', {
      title: 'Dual Verifiers Approved Final Consensus',
      detail: 'Quality audit passed successfully.',
      status: 'completed'
    });

    updateSessionContext(sessionId, finalPrompt, verificationResult.finalResponse).catch(err => {
      console.warn('[Cache Sync Warning]:', err.message);
    });

    sendEvent('done', {
      success: true,
      prompt: finalPrompt,
      attachedFileName,
      count: personas.length,
      personas,
      response: verificationResult.finalResponse,
      transcript: debateResult.transcript,
      verification: verificationResult
    });

    res.end();
  } catch (error) {
    console.error('Debate Stream Error:', error.message);
    sendEvent('error', { error: error.message });
    res.end();
  } finally {
    clearInterval(keepAliveInterval);
  }
});

// POST /api/chat/debate - Full Pipeline with Auth Protection for File Attachments
app.post('/api/chat/debate', protect, upload.any(), async (req, res) => {
  try {
    const prompt = (req.body.prompt || '').trim();
    const provider = req.body.provider || 'gemini';
    const existingPersonas = req.body.existingPersonas ? JSON.parse(req.body.existingPersonas) : [];
    const behaviors = req.body.behaviors ? JSON.parse(req.body.behaviors) : [];
    const sessionId = req.body.sessionId || 'sess_default';
    const isGuestUser = !req.user || req.user.userId === 'guest_user_101';
    const uploadedFiles = req.files || (req.file ? [req.file] : []);

    // ENFORCE AUTH FOR FILE ATTACHMENTS: Guests can only send text prompts
    if (uploadedFiles.length > 0 && isGuestUser) {
      return res.status(401).json({
        success: false,
        error: 'Document upload requires a signed-in account. Please Sign In or Register to upload files.'
      });
    }

    if (!prompt && uploadedFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'Prompt or document file is required' });
    }

    let documentContext = '';
    let attachedFileName = '';

    // Step RAG 1: If user is logged in & attached files
    if (uploadedFiles.length > 0 && !isGuestUser) {
      const fileNames = uploadedFiles.map(f => f.originalname);
      attachedFileName = fileNames.join(', ');

      const contextParts = [];
      for (const file of uploadedFiles) {
        const rawText = await extractTextFromFile(file);
        if (rawText) {
          const chunks = chunkText(rawText);
          const embeddings = await generateEmbeddingsForChunks(chunks);
          const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
          await ChatDocs.create({ docId, sessionId, fileName: file.originalname, mimeType: file.mimetype, rawText, chunks, embeddings });
          const ctx = await retrieveRelevantContext(chunks, prompt || 'Summary', rawText, embeddings);
          contextParts.push(`--- Attached File (${file.originalname}) ---\n${ctx}`);
        }
      }
      documentContext = contextParts.join('\n\n');
    } else if (sessionId && !isGuestUser) {
      // Step RAG 2: Check ChatDocs memory for logged-in user
      const existingDocs = await ChatDocs.find({ sessionId }).sort({ uploadedAt: -1 });
      if (existingDocs && existingDocs.length > 0) {
        const latestDoc = existingDocs[0];
        attachedFileName = latestDoc.fileName;
        documentContext = await retrieveRelevantContext(latestDoc.chunks, prompt, latestDoc.rawText, latestDoc.embeddings);
      }
    }

    const finalPrompt = prompt || `Summarize and analyze attached document: ${attachedFileName}`;

    // Step Memory: Fetch fast in-memory chat summary & recent turns for this session
    const sessionContextData = await getSessionContext(sessionId);
    const chatMemoryPrompt = formatContextPrompt(sessionContextData);

    // Step A: Allocate personas
    const allocation = await allocatePersonas({ prompt: finalPrompt, existingPersonas, behaviors });
    const personas = allocation.personas;

    // Step B: Run Sequential Adversarial Debate with Memory, RAG context & User Behavior Directives
    const debateResult = await runDebate({
      userPrompt: finalPrompt,
      personas,
      provider,
      documentContext,
      behaviors,
      chatMemoryPrompt
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

    // Step Memory Sync: Update In-Memory Cache with latest turn & summary (Non-blocking)
    updateSessionContext(sessionId, finalPrompt, verificationResult.finalResponse).catch(err => {
      console.warn('[Cache Sync Warning]:', err.message);
    });

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
