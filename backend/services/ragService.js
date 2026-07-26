import pdfParse from 'pdf-parse';

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
 * Smart RAG Context Retrieval:
 * - If document is under 25,000 characters, passes the FULL text so no details are lost.
 * - If document is larger, retrieves the top matching chunks based on user prompt.
 */
export function retrieveRelevantContext(chunks, userPrompt, rawText = '', topK = 8) {
  // Pass full text if small/medium document
  if (rawText && rawText.length > 0 && rawText.length < 25000) {
    console.log(`🧠 Using FULL Document Text Context (${rawText.length} chars)`);
    return rawText;
  }

  if (!chunks || chunks.length === 0) return rawText || '';

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
