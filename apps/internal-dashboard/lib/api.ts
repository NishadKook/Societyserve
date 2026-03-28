import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://societyserve-production.up.railway.app';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('internalAccessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('internalAccessToken');
      localStorage.removeItem('internalRefreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
