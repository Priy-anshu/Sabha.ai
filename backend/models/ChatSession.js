import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  sender: { type: String, enum: ['user', 'ai'], required: true },
  text: { type: String, required: true },
  personas: { type: Array, default: [] },
  transcript: { type: Array, default: [] },
  verification: { type: Object, default: null },
  timestamp: { type: Date, default: Date.now }
});

const ChatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, default: 'user_default_101', index: true },
  title: { type: String, default: 'New Conversation' },
  activePersonas: { type: Array, default: [] },
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const ChatSession = mongoose.model('ChatSession', ChatSessionSchema);
