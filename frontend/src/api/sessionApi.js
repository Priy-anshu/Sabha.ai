import { fetchWithAuth } from './apiConfig.js';

export async function getSessions() {
  const res = await fetchWithAuth('/api/sessions');
  return res.json();
}

export async function getSessionById(sessionId, limit = 15, offset = 0) {
  const res = await fetchWithAuth(`/api/sessions/${sessionId}?limit=${limit}&offset=${offset}`);
  return res.json();
}

export async function saveSession(sessionData) {
  const res = await fetchWithAuth('/api/sessions/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData)
  });
  return res.json();
}

export async function deleteSession(sessionId) {
  const res = await fetchWithAuth(`/api/sessions/${sessionId}`, {
    method: 'DELETE'
  });
  return res.json();
}
