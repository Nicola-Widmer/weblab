import { test, expect } from '@playwright/test';

test.describe('app shell', () => {
  // Runs against a clean, signed-out context — the `chromium` project's
  // storage state is deliberately not used here.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects to Keycloak when signed out', async ({ page }) => {
    // The app briefly renders, `/auth/me` 401s, and `auth-redirect.ts` sends
    // the whole page to the BFF login (ADR-0005) — no client-side "Sign in"
    // moment to assert on, only the identity provider it lands on.
    await page.goto('/');
    await page.waitForURL(/\/realms\/wmp\//);
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  });
});

test.describe('signed in', () => {
  test('lands on the songs view and can reach playlists', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/songs$/);
    await expect(page.getByRole('heading', { name: 'Songs' })).toBeVisible();

    await page.getByRole('link', { name: 'Playlists' }).click();
    await expect(page).toHaveURL(/\/playlists$/);
    await expect(page.getByRole('heading', { name: 'Playlists' })).toBeVisible();
  });
});
