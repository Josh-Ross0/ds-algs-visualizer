import { expect, test } from '@playwright/test';

test('edit a weight, run Dijkstra, answer Extract_Min by clicking the graph', async ({ page }) => {
  await page.goto('/#/dijkstra');
  // exact: the pseudocode heading "Dijkstra(G, w, s)" would also match a substring search.
  await expect(page.getByRole('heading', { name: 'Dijkstra', exact: true })).toBeVisible();
  await page.locator('[data-edge="s->v1"] .edge-hit').click();
  await page.getByLabel('Weight w(s, v1)').fill('10');
  await expect(page.locator('[data-edge="s->v1"] .edge-weight')).toHaveText('10');

  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  await expect(page.getByRole('dialog', { name: 'Predict the next step' })).toBeVisible();
  await page.locator('[data-vertex="s"]').dispatchEvent('pointerdown');
  await expect(page.getByRole('status')).toContainText('Correct.');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  // s→v1 now costs 10, so v1 is reached through v2: 5 + 4 = 9.
  await expect(page.getByRole('row', { name: /^v1/ })).toContainText('9');
  await expect(page.getByRole('row', { name: /^v1/ })).toContainText('v2');
});

test('Dijkstra page: no horizontal scroll at phone width after Run', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/dijkstra');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
