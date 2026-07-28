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
  const fullUrl = getApiUrl(url);

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetch(fullUrl, {
    ...options,
    headers
  });

  return response;
}
