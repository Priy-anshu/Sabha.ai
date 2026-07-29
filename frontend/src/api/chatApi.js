import { fetchWithAuth } from './apiConfig.js';

export async function sendDebatePrompt({ prompt, file, files, existingPersonas, behaviors, sessionId, signal }) {
  const formData = new FormData();
  formData.append('prompt', prompt || '');

  if (sessionId) formData.append('sessionId', sessionId);
  if (files && Array.isArray(files) && files.length > 0) {
    files.forEach(f => formData.append('files', f));
  } else if (file) {
    formData.append('file', file);
  }
  if (existingPersonas && existingPersonas.length > 0) formData.append('existingPersonas', JSON.stringify(existingPersonas));
  if (behaviors && behaviors.length > 0) formData.append('behaviors', JSON.stringify(behaviors));

  const res = await fetchWithAuth('/api/chat/debate', {
    method: 'POST',
    body: formData,
    signal
  });

  return res.json();
}

export async function sendDebatePromptStream({ prompt, file, files, existingPersonas, behaviors, sessionId, signal, onEvent }) {
  const formData = new FormData();
  formData.append('prompt', prompt || '');

  if (sessionId) {
    formData.append('sessionId', sessionId);
  }

  if (files && Array.isArray(files) && files.length > 0) {
    files.forEach(f => formData.append('files', f));
  } else if (file) {
    formData.append('file', file);
  }

  if (existingPersonas && existingPersonas.length > 0) {
    formData.append('existingPersonas', JSON.stringify(existingPersonas));
  }

  if (behaviors && behaviors.length > 0) {
    formData.append('behaviors', JSON.stringify(behaviors));
  }

  const response = await fetchWithAuth('/api/chat/debate-stream', {
    method: 'POST',
    body: formData,
    signal
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || 'Failed to start live thinking stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n\n');
    buffer = lines.pop();

    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.startsWith('data: ')) {
        try {
          const data = JSON.parse(cleanLine.replace('data: ', ''));
          if (onEvent) onEvent(data);
        } catch (e) {
          console.warn('SSE Parse Error:', e.message);
        }
      }
    }
  }
}
