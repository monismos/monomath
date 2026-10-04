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
  await page.goto('/#fractions');
  await expect(page.getByRole('region', { name: 'Problem bar' })).toBeVisible();
});
test('worked operations, fraction predictions, alternate methods and shape preserve the lesson', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.getByRole('textbox', { name: 'Prediction answer' }).fill('12');
  await page.getByRole('button', { name: 'Check my guess', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.locator('[data-entity-id="left-cut"]')).toHaveAttribute('opacity', '1');
  await page.getByRole('button', { name: 'Bar', exact: true }).click();
  await page.getByRole('button', { name: 'Symbol', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('canvas[data-stage-canvas]')).toBeVisible();
  await expect(page.locator('[data-anchor-id="stage"]')).toHaveAttribute('data-step', '2');
  await expect(page.locator('[data-anchor-id="stage"]')).toHaveAttribute('data-dial', '2');
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByRole('button', { name: '2/3 × 3/5', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.getByRole('textbox', { name: 'Prediction answer' }).fill('6/15');
  await page.getByRole('button', { name: 'Check my guess', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.locator('[data-entity-id="result-piece"]')).toHaveAttribute('opacity', '0.8');
  await page.getByRole('button', { name: '3/4 ÷ 1/8', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.getByRole('textbox', { name: 'Prediction answer' }).fill('6');
  await page.getByRole('button', { name: 'Check my guess', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.locator('[data-entity-id^="result-piece"]')).toHaveCount(6);
  await page.getByRole('button', { name: 'Show another method', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Method', exact: true })).toHaveValue(
    'reciprocal',
  );
  expect(errors).toEqual([]);
});
test('proof checks actual overlap and boss connects symbols, pieces and code', async ({ page }) => {
  await page.getByRole('button', { name: 'Prove', exact: true }).click();
  const proof = page.getByRole('region', { name: 'Fraction proof' });
  await proof.getByRole('combobox', { name: 'Challenge', exact: true }).selectOption('multiply');
  await proof.getByRole('button', { name: 'Check my pieces', exact: true }).click();
  await expect(proof.getByRole('status')).toContainText('Keep exploring');
  const columns = proof.getByRole('button', { name: /^Column \d+$/ }),
    rows = proof.getByRole('button', { name: /^Row \d+$/ });
  for (let i = 0; i < (await columns.count()) - 1; i++) await columns.nth(i).click();
  for (let i = 0; i < (await rows.count()) - 1; i++) await rows.nth(i).click();
  await proof.getByRole('button', { name: 'Check my pieces', exact: true }).click();
  await expect(proof.getByRole('status')).toContainText('Proof complete');
  await proof.getByRole('button', { name: 'Piece 1 · selected', exact: true }).click();
  await proof.getByRole('button', { name: 'Check my pieces', exact: true }).click();
  await expect(proof.getByRole('status')).toContainText('Keep exploring');
  await page.getByRole('button', { name: 'Boss', exact: true }).click();
  const label = await proof.getByText(/Predict the sum of/).textContent();
  const fractions = label!.match(/\d+\/\d+/g)!.map((s) => s.split('/').map(Number));
  const [[a, d], [b, e]] = fractions;
  const common = d * e;
  const count = a * e + b * d;
  await proof.getByRole('textbox', { name: 'Boss symbolic answer' }).fill(`${count}/${common}`);
  await proof.getByRole('button', { name: 'Check this connection', exact: true }).click();
  const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
  const cuts = common / gcd(d, e),
    selected = (a * cuts) / d + (b * cuts) / e;
  await proof
    .getByRole('slider', { name: 'Equal cuts per whole', exact: true })
    .evaluate((input, value) => {
      const node = input as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(node, String(value));
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }, cuts);
  await proof.getByRole('spinbutton', { name: 'Left recut', exact: true }).fill(String(cuts));
  await proof.getByRole('spinbutton', { name: 'Right recut', exact: true }).fill(String(cuts));
  for (let i = 1; i <= selected; i++)
    await proof.getByRole('button', { name: `Piece ${i}`, exact: true }).click();
  await proof.getByRole('button', { name: 'Check this connection', exact: true }).click();
  await proof.getByRole('radio').first().check();
  await proof.getByRole('button', { name: 'Check this connection', exact: true }).click();
  await expect(proof.getByRole('status')).toContainText('Boss complete');
  const xp = await page.locator('summary').filter({ hasText: 'Learning progress' }).textContent();
  expect(xp).toContain('125 XP');
  await page.reload();
  await expect(page.locator('summary').filter({ hasText: 'Learning progress' })).toContainText(
    '125 XP',
  );
});
test('a notelet restores the fraction problem, shape, mode and manipulated state', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Prove', exact: true }).click();
  await page.getByRole('button', { name: 'Stack', exact: true }).click();
  const proof = page.getByRole('region', { name: 'Fraction proof' });
  await proof.getByRole('button', { name: 'Piece 1', exact: true }).click();
  await page.getByRole('button', { name: 'Symbol', exact: true }).click();
  await page.getByRole('button', { name: 'Add notelet', exact: true }).click();
  const stage = page.locator('[data-anchor-id="stage"]');
  await stage.scrollIntoViewIfNeeded();
  const bounds = (await stage.boundingBox())!;
  await page.mouse.click(bounds.x + 150, bounds.y + 90);
  await page.getByRole('textbox', { name: 'Notelet text' }).fill('My fraction experiment');
  await page.getByRole('button', { name: 'Save notelet', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Your notelet', exact: true })).not.toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Open notelet summary/ }).click();
  await page.getByRole('button', { name: /Jump to context/ }).click();
  await expect(page.getByRole('button', { name: 'Stack', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Prove', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    proof.getByRole('button', { name: 'Piece 1 · selected', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-anchor-id="stage"]')).toHaveAttribute('data-dial', '2');
});
