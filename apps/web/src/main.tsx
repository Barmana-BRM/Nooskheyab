import '@fontsource-variable/vazirmatn';
import './styles/index.css';
import './styles/layout.css';
import './styles/landing.css';
import './styles/forms.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { App } from './App';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
});
if ('serviceWorker' in navigator && import.meta.env.PROD)
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
if (Capacitor.isNativePlatform()) {
  void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    const openDialog = document.querySelector('[role="dialog"]');
    if (openDialog) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      return;
    }
    if (canGoBack && window.history.length > 1) window.history.back();
  });
  void CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    try {
      const parsed = new URL(url);
      const isCustomScheme = parsed.protocol === 'pharmacy-mvp:';
      const isTrustedHttps =
        parsed.protocol === 'https:' && parsed.hostname === window.location.hostname;
      if (!isCustomScheme && !isTrustedHttps) return;
      const path = isCustomScheme
        ? `/${parsed.host}${parsed.pathname}`.replace(/^\/+/, '/')
        : parsed.pathname;
      const match = path.match(/^\/request\/(RX-[A-Za-z0-9]{8})$/);
      if (!match?.[1]) return;
      const token = parsed.searchParams.get('token');
      const next = `/request/${match[1]}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.history.pushState({}, '', next);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      // Invalid deep links are ignored without exposing their contents.
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
