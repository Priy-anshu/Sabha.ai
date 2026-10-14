/**
 * Base API Configuration Helper
 * Supports production API Base URL dynamically via VITE_API_BASE_URL
 * Automatically attaches Authorization JWT token if available.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function getApiUrl(path) {
  if (!path) return API_BASE_URL;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
}

export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  const validToken = token && token !== 'undefined' && token !== 'null' ? token : null;
  const fullUrl = getApiUrl(url);

  const headers = {
    ...(options.headers || {}),
    ...(validToken ? { Authorization: `Bearer ${validToken}` } : {})
  };

  const response = await fetch(fullUrl, {
    ...options,
    headers
  });

  // Auto-clear invalid/expired credentials so the app does not remain locked in 401 loop
  if (response.status === 401 && token) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  return response;
}
