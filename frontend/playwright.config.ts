import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the full Compose stack (Playwright per the proposal).
 * Bring the stack up first (`docker compose up -d` at the repo root), then
 * `pnpm e2e`. Self-signed TLS in local Compose → `ignoreHTTPSErrors`.
 */
export default defineConfig({
  testDir: './e2e',
  // Specs share one real backend + one seeded user (no per-test data
  // isolation), so they run one at a time to avoid racing each other's
  // uploads/playlists.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'https://localhost:8443',
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
});
