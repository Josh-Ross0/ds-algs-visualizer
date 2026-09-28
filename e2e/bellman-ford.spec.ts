import { expect, test } from '@playwright/test';

test('run Bellman-Ford on the lecture example to the end', async ({ page }) => {
  await page.goto('/#/bellman-ford');
  await expect(page.getByRole('heading', { name: 'Bellman-Ford' })).toBeVisible();
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  await expect(page.getByRole('button', { name: 'Yes' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Correct.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.getByRole('row', { name: /^v6/ })).toContainText('-6');
});

test('negative weight cycle preset ends on the error line', async ({ page }) => {
  await page.goto('/#/bellman-ford');
  await page.getByLabel('Preset').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText('negative weight cycle');
  await expect(page.locator('.note')).toContainText('stops here');
});

test('Bellman-Ford page: no horizontal scroll at phone width, before and after Run', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/bellman-ford');
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(await overflow()).toBe(false);
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  expect(await overflow()).toBe(false);
});
