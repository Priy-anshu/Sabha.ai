import mongoose from 'mongoose';

const ChatDetailsSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  messageId: { type: String, required: true },
  sender: { type: String, enum: ['user', 'ai'], required: true },
  text: { type: String, required: true },
  personas: { type: Array, default: [] },
  transcript: { type: Array, default: [] },
  verification: { type: Object, default: null },
  attachmentName: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

export const ChatDetails = mongoose.model('ChatDetails', ChatDetailsSchema);
