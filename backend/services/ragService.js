import pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generates 768-dimensional float vector embeddings using Google's text-embedding-004 model
 */
export async function generateEmbedding(text) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || !text || text.trim().length === 0) {
      return [];
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = ['gemini-embedding-001', 'gemini-embedding-2', 'text-embedding-004'];

    for (const modelName of modelsToTry) {
      try {
        const embeddingModel = genAI.getGenerativeModel({ model: modelName });
        const result = await embeddingModel.embedContent(text.slice(0, 2000));
        if (result && result.embedding && result.embedding.values) {
          return result.embedding.values;
        }
      } catch (err) {
        continue;
      }
    }
    return [];
  } catch (err) {
    console.warn(`[Vector Embedding Warning]: ${err.message}`);
    return [];
  }
}

/**
 * Generates vector embeddings array for all document chunks
 */
export async function generateEmbeddingsForChunks(chunks = []) {
  if (!chunks || chunks.length === 0) return [];
  const embeddings = [];

  for (const chunk of chunks) {
    const vector = await generateEmbedding(chunk);
    embeddings.push(vector);
  }

  console.log(`🧬 Generated ${embeddings.filter(e => e.length > 0).length}/${chunks.length} vector embeddings`);
  return embeddings;
}

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
 * Extracts plain text from an uploaded file buffer (.pdf, .txt, .md, .json)
 */
export async function extractTextFromFile(file) {
  if (!file) return '';

  const mimeType = file.mimetype;
  const originalName = file.originalname.toLowerCase();

  try {
    // Extract from PDF
    if (mimeType === 'application/pdf' || originalName.endsWith('.pdf')) {
      const data = await pdfParse(file.buffer);
      console.log(`📄 PDF Extracted text length: ${data.text ? data.text.length : 0} characters`);
      return data.text || '';
    }

    // Extract from plain text, markdown, json
    const text = file.buffer.toString('utf-8');
    console.log(`📄 Text file extracted length: ${text.length} characters`);
    return text;
  } catch (err) {
    console.error('❌ Text extraction error:', err.message);
    return '';
  }
}

/**
 * Splits extracted document text into manageable chunks
 */
export function chunkText(text, chunkSize = 800, overlap = 100) {
  if (!text || text.trim().length === 0) return [];

  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;

  for (const word of words) {
    currentChunk.push(word);
    currentLength += word.length + 1;

    if (currentLength >= chunkSize) {
      chunks.push(currentChunk.join(' '));
      const overlapWords = currentChunk.slice(-Math.floor(overlap / 10));
      currentChunk = [...overlapWords];
      currentLength = currentChunk.join(' ').length;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

/**
 * Vector-Augmented Smart RAG Context Retrieval:
 * Uses Google text-embedding-004 + Cosine Similarity to find top semantic chunks (~500 tokens),
 * significantly reducing LLM token cost. Fallbacks to keyword scoring if vectors are unavailable.
 */
export async function retrieveRelevantContext(chunks = [], userPrompt = '', rawText = '', embeddings = [], topK = 5) {
  // If small document under 15,000 characters, pass full text safely
  if (rawText && rawText.length > 0 && rawText.length < 15000) {
    console.log(`🧠 Using FULL Document Text Context (${rawText.length} chars)`);
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
      console.log(`⚡ [Vector RAG Retrieval]: Selected top ${selectedVectorChunks.length} semantic chunks using Cosine Similarity`);
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
  console.log(`🔍 [Keyword RAG Retrieval]: Selected top ${selected.length} keyword-matched chunks`);

  return selected.join('\n---\n');
}
