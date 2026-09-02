import type { ApiError, ApiSuccess } from '@pharmacy-mvp/types';

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields: Record<string, string> | undefined;

  constructor(status: number, payload: ApiError['error']) {
    super(payload.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = payload.code;
    this.fields = payload.fields;
  }
}

export interface AuthStorageAdapter {
  getAccessToken(): string | null;
  setAccessToken(token: string | null): void;
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string | null): Promise<void>;
  getCsrfToken?(): string | null;
  setCsrfToken?(token: string | null): void;
}

export interface ApiClientOptions {
  baseUrl: string;
  authStorage: AuthStorageAdapter;
  fetcher?: typeof fetch;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly authStorage: AuthStorageAdapter;
  private readonly fetcher: typeof fetch;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.authStorage = options.authStorage;
    this.fetcher = options.fetcher ?? fetch;
  }

  async request<T>(path: string, init: RequestInit = {}, allowRefresh = true): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const accessToken = this.authStorage.getAccessToken();
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
    if (response.status === 401 && allowRefresh && !path.includes('/auth/')) {
      const refreshed = await this.refresh();
      if (refreshed) return this.request<T>(path, init, false);
    }
    let payload: ApiSuccess<T> | ApiError;
    try {
      payload = (await response.json()) as ApiSuccess<T> | ApiError;
    } catch {
      throw new ApiClientError(response.status, { code: 'HTTP_ERROR', message: 'خطا در ارتباط با سامانه.' });
    }
    if (!response.ok || !payload.success) {
      if (!payload.success) throw new ApiClientError(response.status, payload.error);
      throw new ApiClientError(response.status, {
        code: 'HTTP_ERROR',
        message: 'خطا در ارتباط با سامانه.',
      });
    }
    return payload.data;
  }

  private async refresh(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = await this.authStorage.getRefreshToken();
    let csrfToken = this.authStorage.getCsrfToken?.() ?? null;
    if (!refreshToken && !csrfToken) {
      const csrfResponse = await this.fetcher(`${this.baseUrl}/auth/csrf`, { method: 'GET', credentials: 'include' });
      if (csrfResponse.ok) {
        const csrfPayload = (await csrfResponse.json()) as ApiSuccess<{ csrfToken: string }>;
        if (csrfPayload.success) {
          csrfToken = csrfPayload.data.csrfToken;
          this.authStorage.setCsrfToken?.(csrfToken);
        }
      }
    }
    const refreshInit: RequestInit = { method: 'POST', credentials: 'include' };
    if (csrfToken) refreshInit.headers = { 'X-CSRF-Token': csrfToken };
    if (refreshToken) {
      refreshInit.headers = { ...(refreshInit.headers ?? {}), 'Content-Type': 'application/json' };
      refreshInit.body = JSON.stringify({ refreshToken });
    }
    const response = await this.fetcher(`${this.baseUrl}/auth/refresh`, refreshInit);
    if (!response.ok) {
      this.authStorage.setAccessToken(null);
      await this.authStorage.setRefreshToken(null);
      return false;
    }
    const payload = (await response.json()) as ApiSuccess<{ accessToken: string; refreshToken?: string }>;
    if (!payload.success) return false;
    this.authStorage.setAccessToken(payload.data.accessToken);
    if (payload.data.refreshToken) await this.authStorage.setRefreshToken(payload.data.refreshToken);
    return true;
  }
}
