import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const apiHost = (() => {
  try {
    return new URL(import.meta.env.VITE_API_BASE_URL ?? '/api/v1', window.location.origin).host;
  } catch {
    return window.location.host;
  }
})();

const allowedHosts = new Set([
  window.location.host,
  apiHost,
  ...(import.meta.env.VITE_ALLOWED_EXTERNAL_HOSTS ?? '')
    .split(',')
    .map((host: string) => host.trim())
    .filter(Boolean),
]);

export const openTrustedUrl = async (value: string): Promise<void> => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return;
  }
  if (!allowedHosts.has(url.host)) return;
  if (url.protocol !== 'https:' && !import.meta.env.DEV) return;
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: url.toString() });
    return;
  }
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
};
