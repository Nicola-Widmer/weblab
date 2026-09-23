import https from 'node:https';
import MCR, { type CoverageReportOptions } from 'monocart-coverage-reports';
import { expect, test as base } from '@playwright/test';

/**
 * Opt-in E2E coverage (`E2E_COVERAGE=1`, see `pnpm e2e:coverage` at the repo
 * root). Records Chromium V8 coverage per test and maps it back to
 * `src/app/**` via the source maps the `production,coverage` build serves.
 */
export const coverageEnabled = !!process.env.E2E_COVERAGE;

// The Compose stack uses a self-signed cert, which Node's fetch rejects.
function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(JSON.parse(body)));
      })
      .on('error', reject);
  });
}

const baseUrl = process.env.E2E_BASE_URL ?? 'https://localhost:8443';

// Hand-written app code only: no generated client, specs or templates.
const isAppSource = (path: string) =>
  path.includes('src/app/') &&
  !path.includes('src/app/api/') &&
  path.endsWith('.ts') &&
  !path.endsWith('.spec.ts');

export const coverageOptions: CoverageReportOptions = {
  name: 'Frontend E2E coverage',
  outputDir: './coverage-e2e',
  reports: ['console-summary', 'json-summary', 'v8'],
  // Only the SPA's own bundles — not Keycloak's login-page scripts.
  entryFilter: (entry) => entry.url.startsWith(baseUrl) && entry.url.endsWith('.js'),
  sourceFilter: (path) => isAppSource(path),
  // Count files no test loaded too (e.g. unvisited lazy chunks) as 0 %.
  all: { dir: ['./src/app'], filter: (path: string) => isAppSource(path) },
  sourceMapResolver: (url, fallback) =>
    url.startsWith('https:') ? fetchJson(url) : fallback(url),
};

export const test = base.extend<{ coverage: void }>({
  coverage: [
    async ({ page }, use) => {
      if (!coverageEnabled) return use();
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
      await use();
      await MCR(coverageOptions).add(await page.coverage.stopJSCoverage());
    },
    { auto: true },
  ],
});

export { expect };
