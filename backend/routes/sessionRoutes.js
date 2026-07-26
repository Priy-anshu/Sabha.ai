import express from 'express';
import { ChatSession } from '../models/ChatSession.js';

const router = express.Router();

// GET /api/sessions - List all chat sessions for sidebar
router.get('/', async (req, res) => {
  try {
    const sessions = await ChatSession.find({}, 'sessionId title activePersonas updatedAt')
      .sort({ updatedAt: -1 });
    return res.json({ success: true, sessions });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/sessions/:sessionId - Get specific session history
router.get('/:sessionId', async (req, res) => {
  try {
    const session = await ChatSession.findOne({ sessionId: req.params.sessionId });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    return res.json({ success: true, session });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sessions/save - Save or update session history
router.post('/save', async (req, res) => {
  try {
    const { sessionId, title, activePersonas, messages } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    const sessionTitle = title || (messages && messages.find(m => m.sender === 'user')?.text?.slice(0, 30)) || 'New Chat';

    const session = await ChatSession.findOneAndUpdate(
      { sessionId },
      {
        sessionId,
        title: sessionTitle,
        activePersonas: activePersonas || [],
        messages: messages || [],
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, session });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/sessions/:sessionId - Delete session
router.delete('/:sessionId', async (req, res) => {
  try {
    await ChatSession.deleteOne({ sessionId: req.params.sessionId });
    return res.json({ success: true, message: 'Session deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
