import { expect, test } from '@playwright/test';

test('BST: search with a predict answer, then delete the root and keep the result', async ({ page }) => {
  await page.goto('/#/bst');
  await expect(page.getByRole('heading', { name: 'Binary Search Tree (BST)' })).toBeVisible();
  await page.getByLabel('Operation').selectOption('search');
  await page.getByLabel('Key').fill('12');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  const dialog = page.getByRole('dialog', { name: 'Predict the next step' });
  await dialog.getByRole('button', { name: 'go left' }).click();
  await expect(page.getByRole('status')).toContainText('Correct.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.locator('.note')).toContainText('Returns the node with key 12.');
  await page.getByRole('button', { name: 'Back to the tree' }).click();

  await page.getByLabel('Operation').selectOption('delete');
  await page.locator('.tnode', { hasText: /^17$/ }).dispatchEvent('pointerdown');
  await expect(page.getByLabel('Key')).toHaveValue('17');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'End' }).click();
  await page.getByRole('button', { name: 'Done: keep result' }).click();
  await expect(page.locator('.tnode', { hasText: /^17$/ })).toHaveCount(0);
  await expect(page.locator('.tnode')).toHaveCount(11);
});

test('BST page: no horizontal scroll at phone width, before and after Run', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/bst');
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(await overflow()).toBe(false);
  await page.getByLabel('Operation').selectOption('insert');
  await page.getByLabel('Key').fill('10');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  expect(await overflow()).toBe(false);
});
