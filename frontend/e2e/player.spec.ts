import { test, expect } from './coverage';
import { deleteSong, songRow, uploadSong } from './helpers';

test.describe('player', () => {
  test('plays a song from the library and toggles pause', async ({ page }) => {
    const title = `E2E Player Song ${Date.now()}`;

    await page.goto('/songs');
    await uploadSong(page, title);
    await songRow(page, title).getByRole('button', { name: `Play ${title}` }).click();

    const bar = page.locator('footer');
    await expect(bar.getByText(title)).toBeVisible();
    await expect(bar.getByRole('button', { name: 'Pause' })).toBeVisible();

    await bar.getByRole('button', { name: 'Pause' }).click();
    await expect(bar.getByRole('button', { name: 'Play', exact: true })).toBeVisible();

    await deleteSong(page, title);
    await expect(bar.getByText('Not playing')).toBeVisible();
  });
});
