import { expect, test } from '@playwright/test';

test('Kruskal: a rejected edge shows its cycle; the run ends with T', async ({ page }) => {
  await page.goto('/#/kruskal');
  await expect(page.getByRole('heading', { name: 'Kruskal', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  // Six big steps reach i = 6, (d, f); two line steps later line 6 rejects it.
  for (let k = 0; k < 6; k++) await page.getByRole('button', { name: 'Next big step' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.locator('.note')).toContainText('has the cycle d – c – f – d');
  await expect(page.locator('.edge.cycle')).toHaveCount(3);
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.locator('.note')).toContainText('total weight 29');
});

test('Kruskal: disconnecting the graph blocks Run', async ({ page }) => {
  await page.goto('/#/kruskal');
  for (const key of ['f--g', 'e--h']) {
    await page.locator(`[data-edge="${key}"]`).click();
    await page.getByRole('button', { name: 'Delete selected' }).click();
  }
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByRole('alert')).toContainText('This graph is not connected.');
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible();
});

test('Kruskal page: no horizontal scroll at phone width after Run', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/kruskal');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
