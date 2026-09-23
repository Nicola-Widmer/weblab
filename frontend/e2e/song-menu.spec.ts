import { test, expect } from './coverage';
import {
  createPlaylist,
  deletePlaylist,
  deleteSong,
  openPlaylist,
  rowMenu,
  rowTitles,
  songRow,
  uploadSong,
} from './helpers';

test.describe('song menu', () => {
  test('adds songs to a playlist (twice), reorders and plays from the menu', async ({ page }) => {
    const stamp = Date.now();
    const a = `E2E Menu A ${stamp}`;
    const b = `E2E Menu B ${stamp}`;
    const playlist = `E2E Menu Playlist ${stamp}`;

    await page.goto('/songs');
    await uploadSong(page, a);
    await uploadSong(page, b);
    await createPlaylist(page, playlist);

    // Add A, B, then A again: a song may appear more than once.
    await page.goto('/songs');
    for (const title of [a, b, a]) {
      await rowMenu(page, title, 'Add to Playlist');
      await page.getByRole('menuitem', { name: playlist }).click();
      await expect(page.getByRole('menuitem', { name: playlist })).toBeHidden();
    }

    await openPlaylist(page, playlist);
    await expect.poll(() => rowTitles(page)).toEqual([a, b, a]);

    // Move B up, then check the order survives a reload (saved server-side).
    await rowMenu(page, b, 'Move Up');
    await expect.poll(() => rowTitles(page)).toEqual([b, a, a]);
    await page.reload();
    await expect.poll(() => rowTitles(page)).toEqual([b, a, a]);

    // Move it back down.
    await rowMenu(page, b, 'Move Down');
    await expect.poll(() => rowTitles(page)).toEqual([a, b, a]);

    // "Play" from the menu starts that song.
    await rowMenu(page, b, 'Play');
    const bar = page.locator('footer');
    await expect(bar.getByText(b)).toBeVisible();
    await bar.getByRole('button', { name: 'Pause' }).click();

    await deletePlaylist(page, playlist);
    await page.goto('/songs');
    await deleteSong(page, a);
    await deleteSong(page, b);
  });

  test('deleting a song removes it from every playlist', async ({ page }) => {
    const stamp = Date.now();
    const keep = `E2E Keep ${stamp}`;
    const gone = `E2E Gone ${stamp}`;
    const playlist = `E2E Cleanup Playlist ${stamp}`;

    await page.goto('/songs');
    await uploadSong(page, keep);
    await uploadSong(page, gone);
    await createPlaylist(page, playlist);

    await page.goto('/songs');
    for (const title of [keep, gone]) {
      await rowMenu(page, title, 'Add to Playlist');
      await page.getByRole('menuitem', { name: playlist }).click();
      await expect(page.getByRole('menuitem', { name: playlist })).toBeHidden();
    }
    await openPlaylist(page, playlist);
    await expect.poll(() => rowTitles(page)).toEqual([keep, gone]);

    // Delete from the library; the SongDeleted handler cleans the playlist
    // asynchronously, so poll after reloads.
    await page.goto('/songs');
    await deleteSong(page, gone);
    await openPlaylist(page, playlist);
    await expect
      .poll(async () => {
        await page.reload();
        await expect(songRow(page, keep)).toBeVisible();
        return rowTitles(page);
      })
      .toEqual([keep]);
    await expect(songRow(page, gone)).toHaveCount(0);

    await deletePlaylist(page, playlist);
    await page.goto('/songs');
    await deleteSong(page, keep);
  });
});
