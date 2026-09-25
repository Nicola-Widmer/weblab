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

/** Clicks `label` in the open confirm modal (`<p-confirmdialog>`) and waits for it to close. */
export async function acceptConfirm(page: Page, label: string): Promise<void> {
  // Not getByRole('alertdialog'): optimus-ui puts that role on both the
  // <p-dialog> host and the modal root, so it would match two elements.
  const modal = page.locator('.p-confirmdialog');
  await modal.getByRole('button', { name: label, exact: true }).click();
  await expect(modal).toBeHidden();
}

/** Deletes the song row titled `title`, accepting the confirm modal. */
export async function deleteSong(page: Page, title: string): Promise<void> {
  await songRow(page, title).getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await acceptConfirm(page, 'Delete');
  await expect(songRow(page, title)).toBeHidden();
}

/** Creates a playlist from `/playlists` and returns its card. */
export async function createPlaylist(page: Page, name: string): Promise<void> {
  await page.goto('/playlists');
  await page.getByRole('button', { name: 'New playlist' }).click();
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('.group', { hasText: name })).toBeVisible();
}

/** Opens the playlist `name` from `/playlists`. */
export async function openPlaylist(page: Page, name: string): Promise<void> {
  await page.goto('/playlists');
  await page.locator('.group', { hasText: name }).getByRole('link').click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

/** Deletes the playlist `name` from `/playlists`, accepting the confirm modal. */
export async function deletePlaylist(page: Page, name: string): Promise<void> {
  await page.goto('/playlists');
  const card = page.locator('.group', { hasText: name });
  await card.getByRole('button', { name: 'Delete playlist' }).click();
  await acceptConfirm(page, 'Delete');
  await expect(card).toBeHidden();
}

/** Opens the `⋯` menu of the `index`-th row titled `title` and picks `item`. */
export async function rowMenu(page: Page, title: string, item: string, index = 0): Promise<void> {
  await songRow(page, title).nth(index).getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: item, exact: true }).click();
}

/** Titles of the visible song rows, top to bottom. */
export async function rowTitles(page: Page): Promise<string[]> {
  const labels = await page.locator('.group button[aria-label^="Play "]').evaluateAll((els) =>
    els.map((el) => el.getAttribute('aria-label') ?? ''),
  );
  return labels.map((label) => label.replace(/^Play /, ''));
}
