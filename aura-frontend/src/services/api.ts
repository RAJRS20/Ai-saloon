import axios from 'axios';

let rawBase = (import.meta.env.VITE_API_BASE_URL || 'https://ai-saloon-production.up.railway.app').trim();
if (rawBase.endsWith('/')) rawBase = rawBase.slice(0, -1);
// Normalize base URL so endpoints starting with '/api' don't produce '/api/api'
if (rawBase.endsWith('/api')) rawBase = rawBase.slice(0, -4);

const API_BASE_URL = rawBase;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 min for AI generation
  headers: {
    'Accept': 'application/json',
  },
});

// Request interceptor — attach JWT token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aura_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('aura_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
