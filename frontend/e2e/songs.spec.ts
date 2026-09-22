import { test, expect } from '@playwright/test';
import { deleteSong, songRow, uploadSong } from './helpers';

test.describe('songs library', () => {
  test('upload, edit and delete a song', async ({ page }) => {
    const title = `E2E Song ${Date.now()}`;
    const renamed = `${title} (renamed)`;

    await page.goto('/songs');
    await uploadSong(page, title);

    const row = songRow(page, title);
    await row.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await page.getByLabel('Title', { exact: true }).fill(renamed);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(songRow(page, renamed)).toBeVisible();

    await deleteSong(page, renamed);
  });

  test('rejects a non-mp3 file', async ({ page }) => {
    await page.goto('/songs');
    await page.setInputFiles('input[type="file"]', {
      name: 'not-a-song.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('nope'),
    });
    await expect(page.getByText('Skipped 1 file(s) that aren’t .mp3.')).toBeVisible();
  });
});
