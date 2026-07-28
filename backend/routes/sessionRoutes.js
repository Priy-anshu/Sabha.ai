import express from 'express';
import { ChatSession } from '../models/ChatSession.js';
import { ChatDetails } from '../models/ChatDetails.js';
import { ChatDocs } from '../models/ChatDocs.js';
import { protect } from '../middleware/authMiddleware.js';
import { generateChatTitle } from '../services/personaAllocator.js';

const router = express.Router();

// GET /api/sessions - Fast metadata list for sidebar
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user?.userId || 'guest_user_101';
    const sessions = await ChatSession.find({ userId }, 'sessionId title activePersonas updatedAt')
      .sort({ updatedAt: -1 });
    return res.json({ success: true, sessions });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/sessions/:sessionId - Get specific session metadata + paginated messages (latest first)
router.get('/:sessionId', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 15;
    const offset = parseInt(req.query.offset) || 0;

    const session = await ChatSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const totalCount = await ChatDetails.countDocuments({ sessionId });
    const skipCount = Math.max(0, totalCount - limit - offset);
    const fetchLimit = Math.min(limit, Math.max(0, totalCount - offset));

    let details = [];
    if (fetchLimit > 0) {
      details = await ChatDetails.find({ sessionId })
        .sort({ timestamp: 1 })
        .skip(skipCount)
        .limit(fetchLimit);
    }

    const formattedMessages = details.map(d => ({
      id: d.messageId,
      sender: d.sender,
      text: d.text,
      personas: d.personas || [],
      transcript: d.transcript || [],
      verification: d.verification || null,
      attachmentName: d.attachmentName || ''
    }));

    const hasMore = totalCount > (limit + offset);

    return res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        title: session.title,
        activePersonas: session.activePersonas,
        messages: formattedMessages,
        hasMore,
        totalCount
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sessions/save - Save session metadata & message details
router.post('/save', protect, async (req, res) => {
  try {
    const { sessionId, activePersonas, messages } = req.body;
    const userId = req.user?.userId || 'guest_user_101';

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    // Check if session already exists to preserve custom title
    let existingSession = await ChatSession.findOne({ sessionId });
    let title = existingSession?.title;

    if (!title || title === 'New Chat' || title === 'New Conversation') {
      const firstUserMsg = messages && messages.find(m => m.sender === 'user')?.text;
      title = await generateChatTitle(firstUserMsg);
    }

    // 1. Update ChatSession metadata
    const session = await ChatSession.findOneAndUpdate(
      { sessionId },
      {
        sessionId,
        userId,
        title,
        activePersonas: activePersonas || [],
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // 2. Save/upsert latest message turns into ChatDetails
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        await ChatDetails.findOneAndUpdate(
          { sessionId, messageId: String(msg.id) },
          {
            sessionId,
            messageId: String(msg.id),
            sender: msg.sender,
            text: msg.text,
            personas: msg.personas || [],
            transcript: msg.transcript || [],
            verification: msg.verification || null,
            timestamp: msg.timestamp || new Date()
          },
          { upsert: true, new: true }
        );
      }
    }

    return res.json({ success: true, session });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/sessions/:sessionId - Cascade delete session metadata, messages & docs
router.delete('/:sessionId', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;

    await Promise.all([
      ChatSession.deleteOne({ sessionId }),
      ChatDetails.deleteMany({ sessionId }),
      ChatDocs.deleteMany({ sessionId })
    ]);

    return res.json({ success: true, message: 'Session deleted cleanly across all models' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
