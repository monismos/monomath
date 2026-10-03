import { test, expect } from '@playwright/test';
test('dial and step survive 2D/3D changes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Interactive 2D workbench' })).toBeVisible();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.getByRole('button', { name: 'Symbol', exact: true }).click();
  await expect(page.locator('[data-anchor-id="stage"]')).toHaveAttribute('data-step', '1');
  await expect(page.locator('[data-anchor-id="stage"]')).toHaveAttribute('data-dial', '2');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('[data-anchor-id="stage"]')).toHaveAttribute('data-step', '1');
  await expect(page.locator('[data-anchor-id="stage"]')).toHaveAttribute('data-dial', '2');
});
test('tether selection lights the related token', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.locator('[data-entity-id="slice-0"]').click();
  await expect(page.getByText('Same colour. Same idea.')).toBeVisible();
});
test('step animations move the piece and focused buttons keep Space behavior', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '2D', exact: true }).click();
  const next = page.getByRole('button', { name: 'Next step', exact: true });
  await next.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-anchor-id="stage"]')).toHaveAttribute('data-step', '1');
  await expect(page.locator('[data-entity-id="slice-3"]')).toHaveAttribute(
    'transform',
    /translate\(422 /,
  );
  await expect(page.getByRole('button', { name: 'Play lesson', exact: true })).toBeVisible();
});
