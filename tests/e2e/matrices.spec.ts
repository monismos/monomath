import { test, expect, type Page } from '@playwright/test';

test('maximum 3×3 composition and planes stay within budgets without widening the page', async ({
  page,
}, info) => {
  const errors: string[] = [];
  const driverNotices: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (/GL Driver Message \(OpenGL, Performance.*GPU stall due to ReadPixels/.test(message.text()))
      driverNotices.push(message.text());
    else if (['error', 'warning'].includes(message.type())) errors.push(message.text());
  });
  for (const [input, answer, choice] of [
    ['multiply([6,6,6;6,-6,6;6,6,-6],[6,6,6;6,-6,6;6,6,-6])', '108', false],
    ['solve([1,1,0;0,2,0;0,0,-1],[3;4;2])', 'unique', true],
  ] as const) {
    await study(page, input);
    await page.getByRole('button', { name: 'Lattice', exact: true }).click();
    await predict(page, answer, choice);
    await finish(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    await page.getByRole('button', { name: '3D', exact: true }).click();
    const canvas = page.locator('canvas[data-stage-canvas]');
    await expect(canvas).toBeVisible();
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-render-calls')))
      .toBeGreaterThan(0);
    expect(Number(await canvas.getAttribute('data-render-calls'))).toBeLessThanOrEqual(150);
    expect(Number(await canvas.getAttribute('data-render-triangles'))).toBeLessThan(200000);
    await info.attach('matrix-render-budget', {
      body: JSON.stringify({
        input,
        calls: await canvas.getAttribute('data-render-calls'),
        triangles: await canvas.getAttribute('data-render-triangles'),
      }),
      contentType: 'application/json',
    });
    await page.getByRole('button', { name: '2D', exact: true }).click();
  }
  expect(errors).toEqual([]);
  await info.attach('headless-driver-notices', {
    body: JSON.stringify(driverNotices),
    contentType: 'application/json',
  });
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
  await page.goto('/#matrices');
  await expect(page.getByRole('heading', { name: 'Move the axes. Move the world.' })).toBeVisible();
});
async function study(page: Page, input: string) {
  await page.getByRole('textbox', { name: 'What shall we explore?' }).fill(input);
  await page.getByRole('button', { name: 'Show the steps', exact: true }).click();
}
async function predict(page: Page, guess: string, choice = false) {
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  if (choice) await page.getByRole('button', { name: guess, exact: true }).click();
  else await page.getByRole('textbox', { name: 'Prediction answer' }).fill(guess);
  await page.getByRole('button', { name: 'Check my guess', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
}
async function finish(page: Page) {
  const seek = page.getByRole('slider', { name: 'Seek step' });
  await seek.focus();
  await seek.press('End');
}
test('affine vertices, signed area and both dimensions share the same lesson', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#map');
  await expect(
    page.getByRole('button', { name: 'Functions and graphs: Coming soon' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Matrices: Open lab' }).click();
  await page.getByRole('button', { name: 'Lattice', exact: true }).click();
  const unit = page.locator('[data-entity-id="unit"] polygon').first();
  const start = await unit.getAttribute('points');
  await predict(page, '1');
  expect(await unit.getAttribute('points')).not.toBe(start);
  await finish(page);
  await expect(page.getByRole('region', { name: 'Matrix construction controls' })).toContainText(
    'det(A) = 1',
  );
  await page.getByRole('button', { name: 'Eigenvector directions', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Matrix construction controls' })).toContainText(
    'λ≈1.000',
  );
  await page.getByRole('button', { name: 'Shape', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const canvas = page.locator('canvas[data-stage-canvas]');
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-render-triangles')))
    .toBeGreaterThan(0);
  expect(Number(await canvas.getAttribute('data-render-calls'))).toBeLessThanOrEqual(150);
  expect(Number(await canvas.getAttribute('data-render-triangles'))).toBeLessThan(200000);
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect(page.locator('[data-anchor-id="stage"]')).toHaveAttribute('data-dial', '1');
  await info.attach('matrices-shear', {
    body: await page.screenshot({ path: info.outputPath('matrices-shear.png'), fullPage: true }),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Cell blocks', exact: true }).click();
  await expect(page.locator('[data-entity-id="a-0-0"]')).toHaveAttribute('tabindex', '0');
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(page.locator('[data-entity-id="a-0-0"]')).toHaveAttribute('tabindex', '0');
  await study(page, 'determinant([0,1;1,0])');
  await predict(page, '-1');
  await finish(page);
  await expect(page.getByRole('region', { name: 'Matrix construction controls' })).toContainText(
    'orientation reverses',
  );
  await page.getByRole('button', { name: 'Show another method', exact: true }).click();
  await page.getByRole('slider', { name: 'Seek step' }).fill('2');
  await expect(page.getByText('Eliminate below the diagonal', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('products sweep a row and column and tethers work in both directions', async ({ page }) => {
  await study(page, 'multiply([1,2;3,4],[2,0;1,2])');
  await predict(page, '4');
  await expect(page.locator('[data-entity-id="product-label-0"]')).toContainText('1×2=2');
  await expect(page.locator('[data-entity-id="label-out-0-0"]')).toContainText('4');
  await page.locator('[data-entity-id="label-out-0-0"]').click();
  await expect(page.locator('.tk-out-0-0').first()).toHaveCSS(
    'background-color',
    'rgba(255, 224, 102, 0.376)',
  );
  await page.locator('.tk-C').first().click();
  await expect(page.locator('[data-entity-id="unit"] polygon').first()).toHaveAttribute(
    'stroke',
    '#FFE066',
  );
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.locator('[data-entity-id="product-label-0"]')).toContainText('1×0=0');
  await page.getByRole('button', { name: 'Show another method', exact: true }).click();
  await expect(page.locator('[data-entity-id="product-label-0"]')).toContainText('3×2=6');
  await page.getByRole('combobox', { name: 'Matrix code language' }).selectOption('numpy');
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(page.locator('pre')).toContainText('A @ B');
});
test('inverse, intersecting lines, singular systems and a 3D cube are real constructions', async ({
  page,
}, info) => {
  await study(page, 'inverse([2,1;1,1])');
  await predict(page, '1');
  await finish(page);
  await expect(page.getByRole('region', { name: 'Matrix construction controls' })).toContainText(
    'C[2,2]',
  );
  await page.getByRole('button', { name: 'Show another method', exact: true }).click();
  await page.getByRole('slider', { name: 'Seek step' }).fill('2');
  await expect(
    page
      .getByRole('complementary', { name: 'Worked solution' })
      .getByText(
        'Reduce [A | I] to [I | C]. The same row operations that undo A construct the inverse C.',
        { exact: true },
      ),
  ).toBeVisible();
  for (const [input, classification] of [
    ['solve([2,1;1,-1],[5;1])', 'unique'],
    ['solve([1,2;2,4],[3;6])', 'infinite'],
    ['solve([1,2;2,4],[3;5])', 'none'],
  ]) {
    await study(page, input);
    await page.getByRole('button', { name: 'Lattice', exact: true }).click();
    await predict(page, classification, true);
    await finish(page);
    await expect(page.getByRole('region', { name: 'Matrix construction controls' })).toContainText(
      'Solutions: ' + classification,
    );
    if (classification === 'none')
      await expect(page.locator('[data-entity-id="intersection"]')).toHaveAttribute('opacity', '0');
    else
      await expect(page.locator('[data-entity-id="intersection"]')).toHaveAttribute('opacity', '1');
  }
  await study(page, 'transform([1,1,0;0,2,0;0,0,-1])');
  await predict(page, '1');
  await finish(page);
  expect(await page.locator('[data-entity-id="unit"] polygon').count()).toBe(6);
  await expect(page.getByRole('region', { name: 'Matrix construction controls' })).toContainText(
    'det(A) = -2',
  );
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const canvas = page.locator('canvas[data-stage-canvas]');
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-render-calls')))
    .toBeGreaterThan(0);
  expect(Number(await canvas.getAttribute('data-render-calls'))).toBeLessThanOrEqual(150);
  expect(Number(await canvas.getAttribute('data-render-triangles'))).toBeLessThan(200000);
  await info.attach('matrices-cube', {
    body: await page.screenshot({ path: info.outputPath('matrices-cube.png'), fullPage: true }),
    contentType: 'image/png',
  });
});
test('actual basis construction and all Boss phases must agree', async ({ page }) => {
  await page.getByRole('button', { name: 'Prove', exact: true }).click();
  await page.getByRole('combobox', { name: 'Matrix challenge' }).selectOption('determinant');
  await page.getByRole('textbox', { name: 'Determinant claim' }).fill('4');
  await page.getByRole('button', { name: 'Check proof', exact: true }).click();
  await expect(page.getByRole('status').last()).toContainText('Keep exploring');
  // Seed 12345: A=[1,2;-1,2], det=4.
  for (const [name, value] of [
    ['1,1', '1'],
    ['1,2', '2'],
    ['2,1', '-1'],
    ['2,2', '2'],
  ]) {
    await page.getByRole('textbox', { name: 'Cell ' + name, exact: true }).fill(value);
    await page.getByRole('checkbox', { name: 'Include cell ' + name, exact: true }).check();
  }
  await page.getByRole('button', { name: 'Check proof', exact: true }).click();
  await expect(page.getByRole('status').last()).toContainText('Proof complete');
  await page.getByRole('button', { name: 'Boss', exact: true }).click();
  await page.getByRole('textbox', { name: 'Determinant claim' }).fill('4');
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Connection 2 of 3' })).toBeVisible();
  for (const [name, value] of [
    ['1,1', '1'],
    ['1,2', '2'],
    ['2,1', '-1'],
    ['2,2', '2'],
  ]) {
    await page.getByRole('textbox', { name: 'Cell ' + name, exact: true }).fill(value);
    await page.getByRole('checkbox', { name: 'Include cell ' + name, exact: true }).check();
  }
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await page.getByRole('radio', { name: 'Loop option 2' }).check();
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await expect(page.getByRole('status').last()).toContainText('Keep exploring');
  await page.getByRole('radio', { name: 'Loop option 1' }).check();
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await expect(page.getByRole('status').last()).toContainText('Boss complete');
});
test('offline notelet Jump restores matrix construction, code, cursor, dial and dimension', async ({
  page,
  context,
}) => {
  await page.getByRole('button', { name: 'Prove', exact: true }).click();
  await page.getByRole('combobox', { name: 'Matrix challenge' }).selectOption('inverse');
  await page.getByRole('textbox', { name: 'Cell 1,1', exact: true }).fill('1');
  await page.getByRole('checkbox', { name: 'Include cell 1,1', exact: true }).check();
  await page.getByRole('button', { name: 'Inspect cell 2,1', exact: true }).click();
  await page.getByRole('combobox', { name: 'Matrix code language' }).selectOption('numpy');
  await page.getByRole('button', { name: 'Lattice', exact: true }).click();
  await page.getByRole('button', { name: 'Shape', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('canvas[data-stage-canvas]')).toBeVisible();
  await page.getByRole('button', { name: 'Add notelet', exact: true }).click();
  const stage = page.locator('[data-anchor-id="stage"]');
  await stage.scrollIntoViewIfNeeded();
  const b = (await stage.boundingBox())!;
  await page.mouse.click(b.x + 120, b.y + 90);
  await page.getByRole('textbox', { name: 'Notelet text' }).fill('Reverse this basis');
  await page.getByRole('button', { name: 'Save notelet', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Your notelet', exact: true })).not.toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Move the axes. Move the world.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.getByRole('button', { name: /Open notelet summary/ }).click();
  await page.getByRole('button', { name: /Jump to context/ }).click();
  await expect(page.getByRole('button', { name: 'Prove', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('combobox', { name: 'Matrix challenge' })).toHaveValue('inverse');
  await expect(page.getByRole('textbox', { name: 'Cell 1,1', exact: true })).toHaveValue('1');
  await expect(page.getByRole('checkbox', { name: 'Include cell 1,1', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Inspect cell 2,1', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('combobox', { name: 'Matrix code language' })).toHaveValue('numpy');
  await expect(stage).toHaveAttribute('data-dial', '1');
  await expect(page.locator('canvas[data-stage-canvas]')).toBeVisible();
});
