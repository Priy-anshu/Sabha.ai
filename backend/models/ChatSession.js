import mongoose from 'mongoose';

const ChatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, default: 'guest_user_101', index: true },
  title: { type: String, default: 'New Conversation' },
  activePersonas: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const ChatSession = mongoose.model('ChatSession', ChatSessionSchema);
