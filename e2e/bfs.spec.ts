import { expect, test } from '@playwright/test';

test('edit the graph, run BFS, answer a question by clicking the graph', async ({ page }) => {
  await page.goto('/#/bfs');
  await expect(page.getByRole('heading', { name: 'Breadth-First Search (BFS)' })).toBeVisible();

  // Add a vertex (v8) on empty canvas space and connect it to v7.
  await page.getByRole('button', { name: 'Add vertex' }).click();
  const canvas = page.getByRole('img', { name: 'Graph' });
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.92, box.y + box.height * 0.85);
  await expect(page.locator('[data-vertex="v8"]')).toBeVisible();
  await page.getByRole('button', { name: 'Add edge' }).click();
  await page.locator('[data-vertex="v7"]').dispatchEvent('pointerdown');
  await page.locator('[data-vertex="v8"]').dispatchEvent('pointerdown');
  await expect(page.locator('[data-edge="v7--v8"]')).toBeVisible();

  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Next big step' }).click();
  await expect(page.getByRole('dialog', { name: 'Predict the next step' })).toBeVisible();
  await page.locator('[data-vertex="s"]').dispatchEvent('pointerdown');
  await expect(page.getByRole('status')).toContainText('Correct.');

  await page.getByLabel('Predict mode').uncheck();
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.getByRole('row', { name: /^v8/ })).toContainText('4');
});

test('no horizontal scroll at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/#/bfs');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
