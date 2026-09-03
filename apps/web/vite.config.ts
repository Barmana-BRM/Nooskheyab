import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  envDir: '../../',
  resolve: {
    alias: {
      '@pharmacy-mvp/api-client': fileURLToPath(
        new URL('../../packages/api-client/src/index.ts', import.meta.url),
      ),
      '@pharmacy-mvp/validation': fileURLToPath(
        new URL('../../packages/validation/src/index.ts', import.meta.url),
      ),
      '@pharmacy-mvp/types': fileURLToPath(
        new URL('../../packages/types/src/index.ts', import.meta.url),
      ),
      '@pharmacy-mvp/ui': fileURLToPath(
        new URL('../../packages/ui/src/index.tsx', import.meta.url),
      ),
    },
  },
  server: { port: 5173, host: '0.0.0.0' },
  build: { sourcemap: false, target: 'es2020' },
});
