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
  const nextBigStep = page.getByRole('button', { name: 'Next big step' });
  // "Next big step" stops at every question and at every discovery/retraction;
  // click through (skipping any dialog that isn't the edge-type question)
  // until we reach the first edge-type question, bounded so a regression fails
  // loudly instead of hanging.
  for (let i = 0; i < 40; i++) {
    await nextBigStep.click();
    if (await dialog.count()) {
      if ((await dialog.textContent())?.includes('What type is it?')) break;
      await dialog.getByRole('button', { name: 'Skip' }).click();
    }
  }
  await expect(dialog).toContainText('What type is it?');
  // First edge-type question in the lecture trace is (v5, v1): a back edge.
  await expect(page.getByRole('button', { name: 'tree' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'back' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Correct.');
  // Focus returns to the player control used to advance, not to <body>.
  await expect(nextBigStep).toBeFocused();
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
