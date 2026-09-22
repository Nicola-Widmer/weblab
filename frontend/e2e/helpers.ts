import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const MP3_FIXTURE = path.join(__dirname, 'fixtures', 'test-silence.mp3');

/** A song row (`app-song-row`), scoped by its accessible play button. */
export function songRow(page: Page, title: string) {
  return page.locator('.group', { has: page.getByRole('button', { name: `Play ${title}` }) });
}

/**
 * Uploads the fixture .mp3 (real audio, tagged "Test Silence" / "Vitest") then
 * renames it to `title` so parallel specs don't collide on the same row. The
 * caller is on `/songs` with the shared "dev" session (see `auth.setup.ts`).
 */
export async function uploadSong(page: Page, title: string): Promise<void> {
  await page.setInputFiles('input[type="file"]', MP3_FIXTURE);
  const uploaded = songRow(page, 'Test Silence').first();
  await expect(uploaded).toBeVisible({ timeout: 15_000 });

  await uploaded.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(songRow(page, title)).toBeVisible();
}

/** Deletes the song row titled `title`, accepting the confirm dialog. */
export async function deleteSong(page: Page, title: string): Promise<void> {
  page.once('dialog', (dialog) => dialog.accept());
  await songRow(page, title).getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(songRow(page, title)).toBeHidden();
}
