import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import type { AuthStorageAdapter } from '@pharmacy-mvp/api-client';

const REFRESH_KEY = 'pharmacy-refresh-token';

class PlatformAuthStorage implements AuthStorageAdapter {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private csrfToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  async getRefreshToken(): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) return null;
    if (this.refreshToken) return this.refreshToken;
    try {
      const result = await SecureStoragePlugin.get({ key: REFRESH_KEY });
      this.refreshToken = result.value;
      return result.value;
    } catch {
      return null;
    }
  }

  async setRefreshToken(token: string | null): Promise<void> {
    this.refreshToken = token;
    if (!Capacitor.isNativePlatform()) return;
    try {
      if (token) await SecureStoragePlugin.set({ key: REFRESH_KEY, value: token });
      else await SecureStoragePlugin.remove({ key: REFRESH_KEY });
    } catch {
      this.refreshToken = null;
    }
  }

  getCsrfToken(): string | null {
    return this.csrfToken;
  }

  setCsrfToken(token: string | null): void {
    this.csrfToken = token;
  }
}

export const authStorage = new PlatformAuthStorage();
