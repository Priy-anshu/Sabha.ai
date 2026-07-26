import mongoose from 'mongoose';

const ChatDocsSchema = new mongoose.Schema({
  docId: { type: String, required: true, unique: true },
  sessionId: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  mimeType: { type: String, default: '' },
  rawText: { type: String, default: '' },
  chunks: { type: Array, default: [] },
  embeddings: { type: Array, default: [] },
  uploadedAt: { type: Date, default: Date.now }
});

export const ChatDocs = mongoose.model('ChatDocs', ChatDocsSchema);
