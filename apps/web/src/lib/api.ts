import { ApiClient } from '@pharmacy-mvp/api-client';
import { authStorage } from './auth';

export const api = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  authStorage,
});

export const jsonBody = (value: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(value) });
