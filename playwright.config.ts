import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/test/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev:web -- --host 127.0.0.1', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 120_000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['iPhone 13'] } }],
});
