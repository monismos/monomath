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
  await page.goto('/#logic');
  await expect(page.getByRole('heading', { name: 'Make every world visible.' })).toBeVisible();
});
test('prediction guards the reveal, and gate/Venn layers preserve the learner context', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page
    .getByRole('region', { name: 'Problem bar' })
    .getByRole('button', { name: '(p → q) ∧ ¬q', exact: true })
    .click();
  await expect(page.getByText('Result is waiting for your prediction.')).toBeVisible();
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Change step sheet height' }).click();
  await page.getByRole('button', { name: /Read the truth pattern/ }).click();
  await expect(page.getByRole('region', { name: 'Predict before the reveal' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next step', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Contingent', exact: true }).click();
  await page.getByRole('button', { name: 'Check my guess', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.getByText(/The formula is contingent:/)).toBeVisible();
  await page.getByRole('button', { name: 'Shape', exact: true }).click();
  await expect(page.locator('[data-entity-id="region-p"]')).toHaveAttribute('opacity', '0.2');
  await page.getByRole('button', { name: 'Gate circuit', exact: true }).click();
  await page.getByRole('button', { name: 'Thing', exact: true }).click();
  await expect(page.locator('[data-entity-id="gate-root"]')).toHaveAttribute('opacity', '1');
  await page.getByRole('button', { name: 'Inspect world 2', exact: true }).click();
  await expect(page.getByRole('region', { name: 'World switches' })).toContainText('p=T, q=F');
  const stage = page.locator('[data-anchor-id="stage"]');
  await expect(stage).toHaveAttribute('data-step', '3');
  await page.screenshot({ path: testInfo.outputPath('logic-circuit.png'), fullPage: true });
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('canvas[data-stage-canvas]')).toBeVisible();
  await expect(stage).toHaveAttribute('data-step', '3');
  await expect(stage).toHaveAttribute('data-dial', '0');
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect(page.locator('svg[aria-label="Interactive 2D workbench"]')).toBeVisible();
  expect(errors).toEqual([]);
});
test('proof checks actual worlds, and all Boss phases are usable on touch and desktop', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Prove', exact: true }).click();
  await page.getByRole('combobox', { name: 'Classification' }).selectOption('tautology');
  await page.getByRole('button', { name: 'Check this connection', exact: true }).click();
  await expect(page.getByText(/Keep exploring. Check the exact marked rows/)).toBeVisible();
  await page.getByRole('checkbox', { name: 'Mark world-0', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Mark world-1', exact: true }).check();
  await page.getByRole('button', { name: 'Check this connection', exact: true }).click();
  await expect(page.getByText(/Proof complete/)).toBeVisible();
  await page.getByRole('button', { name: 'Boss', exact: true }).click();
  await page.getByRole('combobox', { name: 'Classification' }).selectOption('contingent');
  await page.getByRole('button', { name: 'Check this connection', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Connection 2 of 3' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Mark world-2', exact: true }).check();
  await page.getByRole('button', { name: 'Check this connection', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Connection 3 of 3' })).toBeVisible();
  const choices = page.getByRole('region', { name: 'Truth table' }).getByRole('radio');
  await choices.nth(1).check();
  await page.getByRole('button', { name: 'Check this connection', exact: true }).click();
  await expect(page.getByText(/Keep exploring. Check the exact marked rows/)).toBeVisible();
  await choices.first().check();
  await page.getByRole('button', { name: 'Check this connection', exact: true }).click();
  await expect(page.getByText(/Boss complete/)).toBeVisible();
});
test('arguments expose concrete counter-worlds and a notelet restores the circuit construction', async ({
  page,
}) => {
  await page
    .getByRole('region', { name: 'Problem bar' })
    .getByRole('button', { name: 'p → q; q ⊢ p', exact: true })
    .click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.getByRole('button', { name: 'Invalid', exact: true }).click();
  await page.getByRole('button', { name: 'Check my guess', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.getByText(/The argument is invalid: p=F, q=T/)).toBeVisible();
  await page.getByRole('button', { name: 'Prove', exact: true }).click();
  await page.getByRole('combobox', { name: 'Logic challenge' }).selectOption('counterworld');
  await page.getByRole('checkbox', { name: 'Mark world-2', exact: true }).check();
  await page.getByRole('button', { name: 'Inspect world 2', exact: true }).click();
  await page.getByRole('button', { name: 'Gate circuit', exact: true }).click();
  await page.getByRole('button', { name: 'Shape', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('canvas[data-stage-canvas]')).toBeVisible();
  await page.getByRole('button', { name: 'Add notelet', exact: true }).click();
  const stage = page.locator('[data-anchor-id="stage"]');
  await stage.scrollIntoViewIfNeeded();
  const bounds = (await stage.boundingBox())!;
  await page.mouse.click(bounds.x + 120, bounds.y + 90);
  await page.getByRole('textbox', { name: 'Notelet text' }).fill('My counter-world circuit');
  await page.getByRole('button', { name: 'Save notelet', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Your notelet', exact: true })).not.toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Open notelet summary/ }).click();
  await page.getByRole('button', { name: /Jump to context/ }).click();
  await expect(page.getByRole('button', { name: 'Prove', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Gate circuit', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('checkbox', { name: 'Mark world-2', exact: true })).toBeChecked();
  await expect(page.getByRole('region', { name: 'World switches' })).toContainText('q=T, r=F');
  await expect(stage).toHaveAttribute('data-dial', '1');
  await expect(page.locator('canvas[data-stage-canvas]')).toBeVisible();
});
