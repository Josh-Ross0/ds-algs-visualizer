import { expect, test } from '@playwright/test';

test('run DFS on the lecture example to the end', async ({ page }) => {
  await page.goto('/#/dfs');
  await expect(page.getByRole('heading', { name: 'Depth-First Search (DFS)' })).toBeVisible();
  await page.getByRole('button', { name: 'Run' }).click();

  await page.getByRole('button', { name: 'Next big step' }).click();
  await expect(page.getByRole('dialog', { name: 'Predict the next step' })).toBeVisible();
  await page.locator('[data-vertex="v1"]').dispatchEvent('pointerdown');
  await expect(page.getByRole('status')).toContainText('Correct.');

  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.getByRole('row', { name: /^v6/ })).toContainText('16');
  await expect(page.locator('body')).not.toContainText(/\b(forward|crossing)\b/);
});

test('edge-type question can be answered with the keyboard', async ({ page }) => {
  await page.goto('/#/dfs');
  await page.getByRole('button', { name: 'Run' }).click();
  const dialog = page.getByRole('dialog', { name: 'Predict the next step' });
  const next = () => page.getByRole('button', { name: 'Next big step' }).click();
  const skip = () => dialog.getByRole('button', { name: 'Skip' }).click();
  // "Next big step" stops at every question and at every discovery/retraction.
  await next(); await skip(); // which vertex is discovered next? (v1, DFS line 5)
  await next();               // v1 discovered (DFS_Visit line 2)
  await next(); await skip(); // which vertex is discovered next? (v2, DFS_Visit line 4)
  await next();               // edge (v1, v2) explored for the first time: edge-type question
  await expect(dialog).toContainText('What type is it?');
  await expect(page.getByRole('button', { name: 'tree' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Correct.');
});

test('DFS page: no horizontal scroll at phone width, before and after Run', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/dfs');
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(await overflow()).toBe(false);
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  expect(await overflow()).toBe(false);
});
