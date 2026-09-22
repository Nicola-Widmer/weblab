import { test, expect } from '@playwright/test';
import { deleteSong, songRow, uploadSong } from './helpers';

test.describe('playlists', () => {
  test('create, add a song, remove it, rename, then delete', async ({ page }) => {
    const songTitle = `E2E Playlist Song ${Date.now()}`;
    const playlistName = `E2E Playlist ${Date.now()}`;
    const renamedPlaylist = `${playlistName} (renamed)`;

    await page.goto('/songs');
    await uploadSong(page, songTitle);

    await page.goto('/playlists');
    await page.getByRole('button', { name: 'New playlist' }).click();
    await page.getByLabel('Name', { exact: true }).fill(playlistName);
    await page.getByRole('button', { name: 'Create' }).click();
    const card = page.locator('.group', { hasText: playlistName });
    await expect(card).toBeVisible();

    await card.getByRole('link').click();
    await expect(page.getByRole('heading', { name: playlistName })).toBeVisible();
    await expect(page.getByText('No songs in this playlist yet.')).toBeVisible();

    await page.goto('/songs');
    await songRow(page, songTitle).getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Add to Playlist' }).click();
    await page.getByRole('menuitem', { name: playlistName }).click();

    await page.goto('/playlists');
    await page.locator('.group', { hasText: playlistName }).getByRole('link').click();
    await expect(songRow(page, songTitle)).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await songRow(page, songTitle).getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Remove from Playlist' }).click();
    await expect(page.getByText('No songs in this playlist yet.')).toBeVisible();

    await page.goto('/playlists');
    const renameCard = page.locator('.group', { hasText: playlistName });
    await renameCard.getByRole('button', { name: 'Rename playlist' }).click();
    await renameCard.getByRole('textbox').fill(renamedPlaylist);
    await renameCard.getByRole('button', { name: 'Save name' }).click();
    await expect(page.locator('.group', { hasText: renamedPlaylist })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page
      .locator('.group', { hasText: renamedPlaylist })
      .getByRole('button', { name: 'Delete playlist' })
      .click();
    await expect(page.locator('.group', { hasText: renamedPlaylist })).toBeHidden();

    await page.goto('/songs');
    await deleteSong(page, songTitle);
  });
});
