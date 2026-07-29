import pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Splits document text into overlapping chunks for Vector RAG processing
 */
export function chunkText(text, chunkSize = 1200, overlap = 200) {
  if (!text) return [];
  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunk = text.slice(startIndex, endIndex);
    chunks.push(chunk);
    startIndex += (chunkSize - overlap);
  }

  return chunks;
}

export async function generateEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('your_')) return [];

  const embeddingModels = ['text-embedding-004', 'embedding-001'];

  for (const modelName of embeddingModels) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.embedContent(text);
        if (result && result.embedding && result.embedding.values) {
          return result.embedding.values;
        }
      } catch (err) {
        if (attempt < 3 && err.message && err.message.includes('fetch failed')) {
          await new Promise(r => setTimeout(r, 800 * attempt));
          continue;
        }
        break;
      }
    }
  }
  return [];
}

/**
 * Batch generates embeddings for array of document text chunks
 */
export async function generateChunkEmbeddings(chunks = []) {
  const embeddings = [];

  for (const chunk of chunks) {
    const vector = await generateEmbedding(chunk);
    embeddings.push(vector);
  }

  return embeddings;
}

export const generateEmbeddingsForChunks = generateChunkEmbeddings;

/**
 * Calculates Cosine Similarity between two float vectors A and B
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Universal Text Extraction Engine:
 * Extracts text from PDFs, Code files (.js, .py, .ts, .java, .cpp, .html, .css, etc.),
 * Spreadsheets (.csv), Data files (.json, .sql, .xml, .yaml), and Text/Markdown.
 */
export async function extractTextFromFile(file) {
  if (!file || !file.buffer) return '';

  const mimeType = file.mimetype || '';
  const originalName = (file.originalname || '').toLowerCase();

  try {
    // 1. PDF Documents
    if (mimeType === 'application/pdf' || originalName.endsWith('.pdf')) {
      const data = await pdfParse(file.buffer);
      return data.text || '';
    }

    // 2. Universal Code, Data, Text & Spreadsheet Files (.js, .py, .csv, .json, .html, .sql, etc.)
    const text = file.buffer.toString('utf-8');
    
    // Strip null bytes or unprintable control characters if present
    const cleanText = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    return cleanText;
  } catch (err) {
    console.error('❌ Text extraction error:', err.message);
    return '';
  }
}

/**
 * Semantic Vector RAG Retrieval Engine:
 * Compares user prompt against document chunk embeddings using Cosine Similarity.
 * Returns top-K most relevant chunks to construct context window,
 * significantly reducing LLM token cost. Fallbacks to keyword scoring if vectors are unavailable.
 */
export async function retrieveRelevantContext(chunks = [], userPrompt = '', rawText = '', embeddings = [], topK = 5) {
  // If small document under 15,000 characters, pass full text safely
  if (rawText && rawText.length > 0 && rawText.length < 15000) {
    return rawText;
  }

  if (!chunks || chunks.length === 0) return rawText || '';

  // 1. Try Vector Embedding Cosine Similarity Search
  try {
    const queryVector = await generateEmbedding(userPrompt);
    if (queryVector && queryVector.length > 0 && embeddings && embeddings.length === chunks.length) {
      const vectorScoredChunks = chunks.map((chunk, idx) => {
        const chunkVector = embeddings[idx];
        const score = cosineSimilarity(queryVector, chunkVector);
        return { chunk, score };
      });

      vectorScoredChunks.sort((a, b) => b.score - a.score);
      const selectedVectorChunks = vectorScoredChunks.slice(0, topK).map(sc => sc.chunk);
      return selectedVectorChunks.join('\n---\n');
    }
  } catch (err) {
    console.warn(`[Vector Search Fallback]: ${err.message}`);
  }

  // 2. Fallback: Keyword-based TF-IDF / BM25 style matching
  const keywords = (userPrompt || '')
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  if (keywords.length === 0) {
    return chunks.slice(0, topK).join('\n---\n');
  }

  const scoredChunks = chunks.map(chunk => {
    const lowerChunk = chunk.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (lowerChunk.includes(kw)) score += 1;
    }
    return { chunk, score };
  });

  scoredChunks.sort((a, b) => b.score - a.score);
  const selected = scoredChunks.slice(0, topK).map(sc => sc.chunk);

  return selected.join('\n---\n');
}
