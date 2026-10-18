import { describe, expect, it, vi } from 'vitest';
import { ApiClient, type AuthStorageAdapter } from '@pharmacy-mvp/api-client';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('ApiClient authentication lifecycle', () => {
  it('calls the platform fetch with its global receiver', async () => {
    vi.stubGlobal('fetch', async function (this: typeof globalThis) {
      expect(this).toBe(globalThis);
      return jsonResponse({ success: true, data: { connected: true }, requestId: 'receiver-test' });
    });
    try {
      const client = new ApiClient({
        baseUrl: 'https://app.example.com/api/v1',
        authStorage: {
          getAccessToken: () => null,
          setAccessToken: () => undefined,
          getRefreshToken: async () => null,
          setRefreshToken: async () => undefined,
        },
      });
      await expect(client.request('/insurance/base')).resolves.toEqual({ connected: true });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('refreshes an expired access token for auth/me before retrying', async () => {
    const state = {
      accessToken: 'expired',
      refreshToken: null as string | null,
      csrfToken: 'csrf',
    };
    const storage: AuthStorageAdapter = {
      getAccessToken: () => state.accessToken,
      setAccessToken: (token) => {
        state.accessToken = token ?? '';
      },
      getRefreshToken: async () => state.refreshToken,
      setRefreshToken: async (token) => {
        state.refreshToken = token;
      },
      getCsrfToken: () => state.csrfToken,
      setCsrfToken: (token) => {
        state.csrfToken = token ?? '';
      },
    };
    const calls: string[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      void init;
      const url = String(input);
      calls.push(url);
      if (url.endsWith('/auth/refresh'))
        return jsonResponse({
          success: true,
          data: { accessToken: 'fresh-access-token' },
          requestId: 'refresh-request',
        });
      if (
        url.endsWith('/auth/me') &&
        calls.filter((item) => item.endsWith('/auth/me')).length === 1
      )
        return jsonResponse(
          {
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'ورود لازم است.' },
            requestId: 'expired-request',
          },
          401,
        );
      return jsonResponse({
        success: true,
        data: { role: 'ADMIN' },
        requestId: 'me-request',
      });
    };
    const client = new ApiClient({
      baseUrl: 'https://app.example.com/api/v1',
      authStorage: storage,
      fetcher,
    });

    const result = await client.request<{ role: string }>('/auth/me');

    expect(result.role).toBe('ADMIN');
    expect(state.accessToken).toBe('fresh-access-token');
    expect(calls).toEqual([
      'https://app.example.com/api/v1/auth/me',
      'https://app.example.com/api/v1/auth/refresh',
      'https://app.example.com/api/v1/auth/me',
    ]);
  });
});
