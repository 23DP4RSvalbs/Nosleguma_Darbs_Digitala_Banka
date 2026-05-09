import axios from 'axios';

const TOKEN_STORAGE_KEY = 'banka_api_token';
const rawBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
const isLocalhostApiUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(rawBaseUrl);

const shouldUseProxyPath =
  rawBaseUrl === '' ||
  (typeof window !== 'undefined' &&
    isLocalhostApiUrl &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1');

const apiBaseUrl = shouldUseProxyPath ? '/api' : `${rawBaseUrl}/api`;

let accessToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);

export function getApiToken(): string | null {
  return accessToken;
}

export function setApiToken(token: string): void {
  accessToken = token;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearApiToken(): void {
  accessToken = null;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

export function extractApiError(error: unknown, fallbackMessage: string): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined;

    if (payload?.message) {
      return payload.message;
    }

    if (payload?.errors) {
      const firstFieldErrors = Object.values(payload.errors)[0];
      if (firstFieldErrors?.[0]) {
        return firstFieldErrors[0];
      }
    }
  }

  return fallbackMessage;
}

export default api;
