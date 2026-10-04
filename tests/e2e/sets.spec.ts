import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'monomath-settings',
      JSON.stringify({
        state: { dimension: '2d', mascot: 'off', reducedMotion: true, tutorialComplete: true },
        version: 1,
      }),
    ),
  );
  await page.goto('/#sets');
  await expect(page.getByRole('heading', { name: 'Sets' })).toBeVisible();
});

test('finite examples, alternate views and dimension switching stay connected', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.getByRole('button', { name: 'A ∩ (B ∪ C)', exact: true }).click();
  await expect(page.getByText(/Result is waiting for your prediction/)).toBeVisible();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await page.getByRole('button', { name: 'Check my guess', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.getByText(/Evaluated result/)).toContainText('{2, 4, 6}');
  await page.getByRole('button', { name: 'Sieve', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Element memberships' })).toBeVisible();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('canvas[data-stage-canvas]')).toBeVisible();
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect(page.locator('svg[aria-label="Interactive 2D workbench"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile membership controls, proof mode and notes remain keyboard reachable', async ({
  page,
}) => {
  const checkbox = page.getByRole('checkbox', { name: 'Element 0 in B' });
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await page.getByRole('button', { name: 'Prove', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Set proof' })).toBeVisible();
  await page.getByRole('button', { name: /A small hint \(0\/3\)/ }).click();
  await expect(page.getByText(/Keep the requested input memberships/)).toBeVisible();
  await page.getByRole('button', { name: 'Boss', exact: true }).click();
  await expect(page.getByText(/Read the set symbols/)).toBeVisible();
});
