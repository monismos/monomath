import { test, expect, type Page } from '@playwright/test';
test('maximum finite grid and dataset stay inside the shared WebGL budgets', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const input = page.getByRole('textbox', { name: 'What shall we explore?' });
  const budgets: Record<string, { calls: number; triangles: number }> = {};
  for (const [name, expression, guess] of [
    ['grid', 'sum(i=0..3,j=0..3,(i+j)^2)', '184'],
    ['data', 'data(-20,-15,-10,-5,0,5,10,15,20,0)', '0'],
  ]) {
    await input.fill(expression);
    await page.getByRole('button', { name: 'Show the steps', exact: true }).click();
    await predict(page, guess);
    const seek = page.getByRole('slider', { name: 'Seek step' });
    await seek.focus();
    await seek.press('End');
    await page.getByRole('button', { name: '3D', exact: true }).click();
    const canvas = page.locator('canvas[data-stage-canvas]');
    await expect(canvas).toBeVisible();
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-render-calls')))
      .toBeGreaterThan(0);
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-render-triangles')))
      .toBeLessThan(200000);
    budgets[name] = {
      calls: Number(await canvas.getAttribute('data-render-calls')),
      triangles: Number(await canvas.getAttribute('data-render-triangles')),
    };
    expect(budgets[name].calls).toBeLessThanOrEqual(150);
    await page.getByRole('button', { name: '2D', exact: true }).click();
  }
  await info.attach('summation-render-budgets', {
    body: JSON.stringify(budgets),
    contentType: 'application/json',
  });
  expect(errors).toEqual([]);
});
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
  await page.goto('/#summation');
  await expect(page.getByRole('heading', { name: 'One term. Then another.' })).toBeVisible();
});
async function predict(page: Page, answer: string) {
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Predict before the reveal' })).toBeVisible();
  if (answer.includes('/'))
    await expect(page.getByRole('textbox', { name: 'Prediction answer' })).toHaveAttribute(
      'inputmode',
      'text',
    );
  await page.getByRole('textbox', { name: 'Prediction answer' }).fill(answer);
  await page.getByRole('button', { name: 'Check my guess', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
}
test('inclusive Hopper, pairing, code and dimensions preserve the worked context', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#map');
  await expect(
    page.getByRole('button', { name: 'Functions and graphs: Coming soon' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Σ Summation: Open lab' }).click();
  await page
    .getByRole('region', { name: 'Problem bar' })
    .getByRole('button', { name: 'sum(i=1..5, 2i+1)', exact: true })
    .click();
  const controls = page.getByRole('region', { name: 'Contribution controls' });
  await expect(controls).toContainText('The running total waits');
  await predict(page, '35');
  await expect(controls).toContainText('1 terms collected; total = 3');
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(controls).toContainText('2 terms collected; total = 8');
  await page.getByRole('button', { name: 'Show another method', exact: true }).click();
  await expect(page.getByText('Method: pairing and power-sum identities.')).toBeVisible();
  const stage = page.locator('[data-anchor-id="stage"]');
  await expect(stage).toHaveAttribute('data-step', '3');
  await page.getByRole('button', { name: 'Shape', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect term 1', exact: true }).click();
  await expect(page.locator('[data-entity-id="term-0"] rect')).toHaveAttribute('stroke', '#FFE066');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const canvas = page.locator('canvas[data-stage-canvas]');
  await expect(canvas).toBeVisible();
  await expect(stage).toHaveAttribute('data-step', '3');
  await expect(stage).toHaveAttribute('data-dial', '1');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-render-calls')))
    .toBeGreaterThan(0);
  expect(Number(await canvas.getAttribute('data-render-calls'))).toBeLessThan(120);
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-render-triangles')))
    .toBeLessThan(100000);
  await page.getByRole('button', { name: '2D', exact: true }).click();
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(controls).toContainText('5 terms collected; total = 35');
  await page.getByRole('combobox', { name: 'Summation code language' }).selectOption('r');
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(page.getByText('total <- sum(2 * i + 1)', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Thing', exact: true }).click();
  await page.screenshot({ path: info.outputPath('summation-hopper.png'), fullPage: true });
  expect(errors).toEqual([]);
});
test('dataset balances exactly and unfolds square areas and standard-deviation ring', async ({
  page,
}, info) => {
  await page
    .getByRole('region', { name: 'Problem bar' })
    .getByRole('button', { name: 'data(4,8,6,5,3)', exact: true })
    .click();
  await predict(page, '26/5');
  const controls = page.getByRole('region', { name: 'Contribution controls' });
  await expect(controls).toContainText('Mean = 26/5');
  await expect(page.locator('[data-entity-id="mean-pin"]')).toHaveAttribute('opacity', '1');
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.locator('[data-entity-id="term-0-label"]')).toContainText('36/25');
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(controls).toContainText('population variance = 74/25');
  await page.getByRole('button', { name: 'Show another method', exact: true }).click();
  await expect(page.getByText('Method: moments identity E[X²]−μ².')).toBeVisible();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(controls).toContainText('σ ≈ 1.720');
  await expect(page.locator('[data-entity-id="sd-ring-0"]')).toHaveAttribute('opacity', '0.7');
  await page.getByRole('button', { name: 'Shape', exact: true }).click();
  await page.screenshot({ path: info.outputPath('summation-squares.png'), fullPage: true });
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('canvas[data-stage-canvas]')).toBeVisible();
  await expect(page.locator('[data-anchor-id="stage"]')).toHaveAttribute('data-step', '5');
});
test('actual contributions and all three Boss connections are checked', async ({ page }) => {
  await page.getByRole('button', { name: 'Prove', exact: true }).click();
  await page.getByRole('textbox', { name: 'Exact claim' }).fill('22');
  await page.getByRole('button', { name: 'Check proof', exact: true }).click();
  await expect(page.getByText(/Keep exploring. Check the actual values/)).toBeVisible();
  for (const [index, value] of ['4', '5', '6', '7'].entries()) {
    await page.getByRole('textbox', { name: 'Term value ' + (index + 1), exact: true }).fill(value);
    await page.getByRole('checkbox', { name: 'Include term ' + (index + 1), exact: true }).check();
  }
  await page.getByRole('button', { name: 'Check proof', exact: true }).click();
  await expect(page.getByText(/Proof complete/)).toBeVisible();
  await page.getByRole('combobox', { name: 'Summation challenge' }).selectOption('variance');
  await page.getByRole('textbox', { name: 'Mean pin coordinate' }).fill('21/5');
  await page.getByRole('textbox', { name: 'Exact claim' }).fill('74/25');
  for (const [index, value] of ['36/25', '196/25', '16/25', '1/25', '121/25'].entries()) {
    await page
      .getByRole('textbox', { name: 'Square area ' + (index + 1), exact: true })
      .fill(value);
    await page.getByRole('checkbox', { name: 'Include term ' + (index + 1), exact: true }).check();
  }
  await page.getByRole('button', { name: 'Check proof', exact: true }).click();
  await expect(page.getByText(/Proof complete/)).toBeVisible();
  await page.getByRole('button', { name: 'Boss', exact: true }).click();
  await page.getByRole('textbox', { name: 'Exact claim' }).fill('22');
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Connection 2 of 3' })).toBeVisible();
  for (const [index, value] of ['4', '5', '6', '7'].entries()) {
    await page.getByRole('textbox', { name: 'Term value ' + (index + 1), exact: true }).fill(value);
    await page.getByRole('checkbox', { name: 'Include term ' + (index + 1), exact: true }).check();
  }
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await page.getByRole('radio', { name: 'Loop option 2' }).check();
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await expect(page.getByText(/Keep exploring. Check the actual values/)).toBeVisible();
  await page.getByRole('radio', { name: 'Loop option 1' }).check();
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await expect(page.getByText(/Boss complete/)).toBeVisible();
});
test('double grid visits change and notelet Jump restores the complete proof model offline', async ({
  page,
  context,
}) => {
  const input = page.getByRole('textbox', { name: 'What shall we explore?' });
  await input.fill('sum(i=1..2,j=1..2,i+j)');
  await page.getByRole('button', { name: 'Show the steps', exact: true }).click();
  await predict(page, '12');
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.locator('[data-entity-id="walker"]')).toContainText('i=1,j=2');
  await page.getByRole('button', { name: 'Show another method', exact: true }).click();
  await expect(page.locator('[data-entity-id="walker"]')).toContainText('i=2,j=1');
  await page.getByRole('button', { name: 'Prove', exact: true }).click();
  await page.getByRole('combobox', { name: 'Summation challenge' }).selectOption('double');
  await page.getByRole('textbox', { name: 'Term value 1', exact: true }).fill('2');
  await page.getByRole('checkbox', { name: 'Include term 1', exact: true }).check();
  await page.getByRole('button', { name: 'Inspect term 3', exact: true }).click();
  await page.getByRole('combobox', { name: 'Summation code language' }).selectOption('sql');
  await page.getByRole('button', { name: 'Shape', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('canvas[data-stage-canvas]')).toBeVisible();
  await page.getByRole('button', { name: 'Add notelet', exact: true }).click();
  const stage = page.locator('[data-anchor-id="stage"]');
  await stage.scrollIntoViewIfNeeded();
  const bounds = (await stage.boundingBox())!;
  await page.mouse.click(bounds.x + 120, bounds.y + 90);
  await page.getByRole('textbox', { name: 'Notelet text' }).fill('My inclusive grid');
  await page.getByRole('button', { name: 'Save notelet', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Your notelet', exact: true })).not.toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'One term. Then another.' })).toBeVisible();
  await page.getByRole('button', { name: /Open notelet summary/ }).click();
  await page.getByRole('button', { name: /Jump to context/ }).click();
  await expect(page.getByRole('button', { name: 'Prove', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('combobox', { name: 'Summation challenge' })).toHaveValue('double');
  await expect(page.getByRole('textbox', { name: 'Term value 1', exact: true })).toHaveValue('2');
  await expect(page.getByRole('checkbox', { name: 'Include term 1', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Inspect term 3', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('combobox', { name: 'Summation code language' })).toHaveValue('sql');
  await expect(stage).toHaveAttribute('data-dial', '1');
  await expect(page.locator('canvas[data-stage-canvas]')).toBeVisible();
});
