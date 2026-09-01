import { test, expect } from '@playwright/test';

/**
 * Placeholder. Real flows (upload a song, build a playlist, play in the
 * record-player view) land with their feature slices. Unskip once the stack
 * serves something to assert against.
 */
test.skip('app shell loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Web Music Player|frontend/);
});
