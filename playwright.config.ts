import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: {
    timeout: 15_000,
  },
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: [
    {
      command: 'npm run start:dev -w packages/api',
      port: 3001,
      reuseExistingServer: !isCI,
      timeout: 180_000,
      env: {
        ...process.env,
        CONFLICT_ANALYSIS_MODE: 'mock_clear',
        COURT_INTEL_MODE: 'mock_contextual',
        CORS_ORIGIN: 'http://localhost:3000',
      },
    },
    {
      command: 'npm run dev -w packages/web',
      port: 3000,
      reuseExistingServer: !isCI,
      timeout: 180_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: 'http://localhost:3001/api',
      },
    },
  ],
});
