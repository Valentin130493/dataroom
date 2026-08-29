import { defineConfig, devices } from '@playwright/test';

const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:3000';
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:55432/dataroom_test';

const apiEnv = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: '4000',
  DATABASE_URL: TEST_DATABASE_URL,
  DIRECT_URL: TEST_DATABASE_URL,
  DISABLE_RATE_LIMIT: 'true',
  CORS_ORIGINS: WEB_URL,
  WEB_APP_URL: WEB_URL,
} as Record<string, string>;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @dataroom/api dev',
      url: `${API_URL}/health`,
      cwd: '../..',
      env: apiEnv,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'pnpm --filter @dataroom/web dev',
      url: WEB_URL,
      cwd: '../..',
      env: { ...process.env, API_ORIGIN: API_URL } as Record<string, string>,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
