import { expect, test } from '@playwright/test';

test('run Prim on the lecture example, answer Extract_Min by clicking the graph', async ({ page }) => {
  await page.goto('/#/prim');
  await expect(page.getByRole('heading', { name: 'Prim', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  await expect(page.getByRole('dialog', { name: 'Predict the next step' })).toBeVisible();
  await page.locator('[data-vertex="r"]').dispatchEvent('pointerdown');
  await expect(page.getByRole('status')).toContainText('Correct.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.getByRole('row', { name: /^f/ })).toContainText('c');
});

test('Prim page: no horizontal scroll at phone width after Run', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/prim');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
