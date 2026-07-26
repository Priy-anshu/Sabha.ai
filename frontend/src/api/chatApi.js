import { fetchWithAuth } from './apiConfig.js';

export async function sendDebatePrompt({ prompt, file, existingPersonas, sessionId }) {
  const formData = new FormData();
  formData.append('prompt', prompt || '');

  if (sessionId) {
    formData.append('sessionId', sessionId);
  }

  if (file) {
    formData.append('file', file);
  }

  if (existingPersonas && existingPersonas.length > 0) {
    formData.append('existingPersonas', JSON.stringify(existingPersonas));
  }

  const res = await fetchWithAuth('/api/chat/debate', {
    method: 'POST',
    body: formData
  });

  return res.json();
}
