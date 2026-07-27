import mongoose from 'mongoose';

const ChatSummarySchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, default: 'guest_user_101', index: true },
  summary: { type: String, default: '' },
  lastUpdated: { type: Date, default: Date.now }
});

export const ChatSummary = mongoose.model('ChatSummary', ChatSummarySchema);
