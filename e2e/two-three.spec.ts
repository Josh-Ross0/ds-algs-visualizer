import { expect, test } from '@playwright/test';

test('2-3 tree: Search with a predict answer, Insert 23, then Delete 19 by clicking its leaf', async ({ page }) => {
  await page.goto('/#/two-three');
  await expect(page.getByRole('heading', { name: '2-3 Tree' })).toBeVisible();
  await page.getByLabel('Operation').selectOption('search');
  await page.getByLabel('Key', { exact: true }).fill('14');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  const dialog = page.getByRole('dialog', { name: 'Predict the next step' });
  await dialog.getByRole('button', { name: 'left child' }).click(); // 14 ≤ the left subtree's key 14
  await expect(page.getByRole('status')).toContainText('Correct.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.locator('.note')).toContainText('Returns the leaf with key 14.');
  await page.getByRole('button', { name: 'Back to the tree' }).click();

  await page.getByLabel('Operation').selectOption('insert');
  await page.getByLabel('Key', { exact: true }).fill('23');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'End' }).click();
  await page.getByRole('button', { name: 'Done: keep result' }).click();
  await expect(page.locator('.tnode.leaf')).toHaveCount(12);

  await page.getByLabel('Operation').selectOption('delete');
  await page.locator('.tnode.leaf').filter({ has: page.locator('.key', { hasText: /^19$/ }) }).dispatchEvent('pointerdown');
  await expect(page.getByLabel('Key', { exact: true })).toHaveValue('19');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'End' }).click();
  await page.getByRole('button', { name: 'Done: keep result' }).click();
  await expect(page.locator('.tnode.leaf')).toHaveCount(11);
  await expect(page.locator('.tnode.leaf .key', { hasText: /^19$/ })).toHaveCount(0);
});

test('2-3 tree: Delete 1 from the sorted tree answers the borrow-or-merge question', async ({ page }) => {
  await page.goto('/#/two-three');
  await page.getByRole('combobox', { name: 'Preset' }).selectOption({ label: 'Sorted inserts (1-7)' });
  await page.getByLabel('Operation').selectOption('delete');
  await page.getByLabel('Key', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Run' }).click();
  // the first big step is the while-loop test (line 8); the second is the question in Borrow_Or_Merge
  await page.getByRole('button', { name: 'Next big step' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  const dialog = page.getByRole('dialog', { name: 'Predict the next step' });
  await dialog.getByRole('button', { name: 'merge' }).click();
  await expect(page.getByRole('status')).toContainText('Correct.');
});

test('2-3 tree page: no horizontal scroll at phone width with the 12-leaf tree, before and after Run', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/two-three');
  await page.getByRole('combobox', { name: 'Preset' }).selectOption({ label: 'Full tree (12 keys)' });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(await overflow()).toBe(false);
  await page.getByLabel('Operation').selectOption('delete');
  await page.getByLabel('Key', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  expect(await overflow()).toBe(false);
});
