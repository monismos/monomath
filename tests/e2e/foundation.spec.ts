import { test, expect } from '@playwright/test';
test('the workbench has a live fraction and persistent preferences', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Small pieces. Big picture.' })).toBeVisible();
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await page.getByRole('button', { name: 'Blueprint', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blueprint');
});
test('production app is installable and available offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
  });
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest/);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Small pieces. Big picture.' })).toBeVisible();
});
