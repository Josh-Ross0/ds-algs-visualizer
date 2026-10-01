import { expect, test } from '@playwright/test';

test('Heap: Extract Min with a predict answer, keep, then Insert', async ({ page }) => {
  await page.goto('/#/heap');
  await expect(page.getByRole('heading', { name: 'Binary Heap (min-heap)' })).toBeVisible();
  await page.getByLabel('Operation').selectOption('extract');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  const dialog = page.getByRole('dialog', { name: 'Predict the next step' });
  await dialog.getByRole('button', { name: '3', exact: true }).click(); // smallest of A[1]=7, A[2]=5, A[3]=3
  await expect(page.getByRole('status')).toContainText('Correct.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.locator('.note')).toContainText('Returns 2.');
  await page.getByRole('button', { name: 'Done: keep result' }).click();
  await expect(page.locator('.marker-label')).toHaveText('heap-size = 9');

  await page.getByLabel('Operation').selectOption('insert');
  await page.getByLabel('Key', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'End' }).click();
  await page.getByRole('button', { name: 'Done: keep result' }).click();
  await expect(page.locator('.tnode .key').first()).toHaveText('1');
  await expect(page.locator('.marker-label')).toHaveText('heap-size = 10');
});

test('Heap: Build Heap from a typed array', async ({ page }) => {
  await page.goto('/#/heap');
  await page.getByLabel('Array A', { exact: true }).fill('5, 3, 1');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await page.getByRole('button', { name: 'Done: keep result' }).click();
  await expect(page.locator('.tnode .key')).toHaveText(['1', '3', '5']);
  await expect(page.locator('.heap-array .cell')).toHaveCount(3);
});

test('Heap page: no horizontal scroll at phone width, before and after Run', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/heap');
  await page.getByRole('combobox', { name: 'Preset' }).selectOption({ label: 'Full heap (15 keys)' });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(await overflow()).toBe(false);
  await page.getByLabel('Operation').selectOption('extract');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  expect(await overflow()).toBe(false);
});
