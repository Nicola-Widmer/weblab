import { expect, test as setup } from '@playwright/test';

const AUTH_FILE = 'e2e/.auth/user.json';

/**
 * Runs once before the authenticated projects (see `playwright.config.ts`).
 * Logs in through the real Keycloak-hosted form (ADR-0005 — the SPA never
 * sees credentials, only the session cookie) with the seeded dev user
 * (`keycloak/import/wmp-realm.json`) and saves the resulting storage state so
 * every other spec starts already signed in.
 */
setup('authenticate as the dev user', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.locator('#username').waitFor();
  await page.locator('#username').fill('dev');
  await page.locator('#password').fill('dev');
  await page.locator('#kc-login').click();

  await page.waitForURL('/');
  await expect(page.getByText('dev@example.com')).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });
});
