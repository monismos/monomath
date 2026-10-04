import { test, expect, type Page } from '@playwright/test';
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
  await page.goto('/#functions');
  await expect(page.getByRole('heading', { name: 'A rule becomes a place.' })).toBeVisible();
});
async function study(page: Page, input: string) {
  await page.getByRole('textbox', { name: 'What shall we explore?' }).fill(input);
  await page.getByRole('button', { name: 'Show the steps', exact: true }).click();
}
async function predict(page: Page, answer: string, choice = false) {
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  const region = page.getByRole('region', { name: 'Predict before the reveal' });
  if (choice) await region.getByRole('button', { name: answer, exact: true }).click();
  else await region.getByRole('textbox', { name: 'Prediction answer' }).fill(answer);
  await region.getByRole('button', { name: 'Check my guess' }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
}
async function finish(page: Page) {
  const slider = page.getByRole('slider', { name: 'Seek step' });
  await slider.focus();
  await slider.press('End');
}
test('coordinates, direct trace dragging, zoom, parameter changes and both tether directions work', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await predict(page, '3');
  await page.getByRole('button', { name: 'Shape', exact: true }).click();
  const controls = page.getByRole('region', { name: 'Function construction controls' });
  await expect(controls).toContainText('Trace (1, 3)');
  const ball = page.locator('[data-entity-id="trace"]');
  await ball.scrollIntoViewIfNeeded();
  const before = await page.getByRole('slider', { name: 'Trace input' }).inputValue(),
    box = (await ball.boundingBox())!;
  if (info.project.name === 'mobile') {
    const client = await page.context().newCDPSession(page);
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    });
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + 30, y, id: 1 }],
    });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await client.detach();
  } else {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
  }
  expect(await page.getByRole('slider', { name: 'Trace input' }).inputValue()).not.toBe(before);
  const graph = page.getByRole('group', { name: 'Interactive 2D workbench' }),
    gb = (await graph.boundingBox())!;
  if (info.project.name === 'mobile') {
    const client = await page.context().newCDPSession(page),
      cx = gb.x + gb.width / 2,
      cy = gb.y + gb.height / 2;
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: cx - 40, y: cy, id: 1 },
        { x: cx + 40, y: cy, id: 2 },
      ],
    });
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: cx - 60, y: cy, id: 1 },
        { x: cx + 60, y: cy, id: 2 },
      ],
    });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await client.detach();
    await expect
      .poll(() => page.getByRole('slider', { name: 'Graph zoom' }).inputValue())
      .not.toBe('1');
  }
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.wheel(0, -120);
  await expect
    .poll(() => page.getByRole('slider', { name: 'Graph zoom' }).inputValue())
    .not.toBe('1');
  await page.getByRole('slider', { name: 'Coefficient x^1', exact: true }).fill('3');
  await expect(page.getByRole('textbox', { name: 'What shall we explore?' })).toHaveValue(
    'y=3*x+1',
  );
  await page.getByRole('checkbox', { name: 'Show tangent' }).uncheck();
  await page.getByRole('slider', { name: 'Seek step' }).fill('0');
  await page.locator('[data-entity-id="curve"] polygon').first().click();
  await expect(page.locator('.tk-curve').first()).toHaveCSS(
    'background-color',
    'rgba(255, 224, 102, 0.376)',
  );
  await page.getByRole('checkbox', { name: 'Show tangent' }).check();
  await predict(page, '4');
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.locator('.tk-slope').first().click();
  await expect(page.locator('[data-entity-id="tangent"] polygon').first()).toHaveAttribute(
    'stroke',
    '#FFE066',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await info.attach('function-line', {
    body: await page
      .locator('[data-anchor-id="stage"]')
      .screenshot({ path: info.outputPath('function-line.png') }),
    contentType: 'image/png',
  });
  expect(errors).toEqual([]);
  await page.goto('/#map');
  await expect(page.getByRole('button', { name: 'Functions and graphs: Open lab' })).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Distributions and Galton: Coming soon' }),
  ).toBeDisabled();
});
test('all quadratic methods use real roots and literal square strips and corner', async ({
  page,
}, info) => {
  await study(page, 'x^2-4*x+3=0');
  await predict(page, '2', true);
  await finish(page);
  await expect(page.getByRole('complementary', { name: 'Worked solution' })).toContainText(
    'x = 1 or 3',
  );
  await page.getByRole('button', { name: 'Show another method', exact: true }).click();
  await page.getByRole('slider', { name: 'Seek step' }).fill('2');
  await expect(page.getByText('Restore the missing corner', { exact: true })).toBeVisible();
  await expect(page.locator('[data-entity-id="square-left"]')).toHaveAttribute('opacity', '1');
  await expect(page.locator('[data-entity-id="square-corner"]')).toHaveAttribute(
    'aria-label',
    'Restore overlap area 4',
  );
  await expect(page.locator('[data-entity-id="curve"]')).toHaveAttribute('opacity', '0');
  await info.attach('completed-square', {
    body: await page
      .locator('[data-anchor-id="stage"]')
      .screenshot({ path: info.outputPath('completed-square.png') }),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: 'Show another method', exact: true }).click();
  await expect(page.getByText('Measure the discriminant', { exact: true })).toBeVisible();
  await study(page, 'x^2+1=0');
  await predict(page, '0', true);
  await finish(page);
  await expect(page.getByRole('complementary', { name: 'Worked solution' })).toContainText(
    'No real roots',
  );
});
test('derivatives, signed rectangle refinement, surface slices and 3D budgets stay connected', async ({
  page,
}, info) => {
  const errors: string[] = [],
    driver: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (/GL Driver Message \(OpenGL, Performance.*GPU stall due to ReadPixels/.test(m.text()))
      driver.push(m.text());
    else if (['error', 'warning'].includes(m.type())) errors.push(m.text());
  });
  await study(page, 'derivative(3*x^2+2*x)');
  await predict(page, '8');
  await finish(page);
  await expect(
    page.getByRole('complementary', { name: 'Worked solution' }).locator('annotation'),
  ).toHaveText("\\htmlClass{tk-curve}{f'(x)=6\\cdot x+2}");
  await page.getByRole('slider', { name: 'Trace input' }).fill('2');
  await expect(page.getByRole('region', { name: 'Function construction controls' })).toContainText(
    'slope ≈ 14',
  );
  await study(page, 'integral(x^2,0,3)');
  await predict(page, '9');
  await finish(page);
  await page.getByRole('slider', { name: 'Rectangle count' }).fill('16');
  await expect(page.getByRole('region', { name: 'Function construction controls' })).toContainText(
    'Exact signed integral: 9',
  );
  await expect(page.locator('[data-entity-id="rectangle-15"]')).toHaveAttribute('opacity', '0.65');
  await study(page, 'integral(-x^2,0,3)');
  await predict(page, '-9');
  await finish(page);
  await expect(page.getByRole('region', { name: 'Function construction controls' })).toContainText(
    'Exact signed integral: -9',
  );
  await study(page, 'z=x^2+y^2');
  await predict(page, '2');
  await finish(page);
  const oldSlice = await page
    .locator('[data-entity-id="slice"] polygon')
    .first()
    .getAttribute('points');
  await page.getByRole('slider', { name: 'Surface slice' }).fill('2');
  expect(
    await page.locator('[data-entity-id="slice"] polygon').first().getAttribute('points'),
  ).not.toBe(oldSlice);
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const canvas = page.locator('canvas[data-stage-canvas]');
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-render-calls')))
    .toBeGreaterThan(0);
  expect(Number(await canvas.getAttribute('data-render-calls'))).toBeLessThanOrEqual(150);
  expect(Number(await canvas.getAttribute('data-render-triangles'))).toBeLessThan(200000);
  await info.attach('function-surface', {
    body: await page
      .locator('[data-anchor-id="stage"]')
      .screenshot({ path: info.outputPath('function-surface.png') }),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Surface slice' })).toHaveValue('2');
  expect(errors).toEqual([]);
  await info.attach('headless-driver-notices', {
    body: JSON.stringify(driver),
    contentType: 'application/json',
  });
});
test('a finite rectangle construction requires each actual height and signed sum', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Prove', exact: true }).click();
  await page.getByRole('combobox', { name: 'Function challenge' }).selectOption('area');
  // Seed 12345: integral(x²,0,2); n=4, width=.5, midpoint heights .0625,.5625,1.5625,3.0625.
  await page.getByRole('textbox', { name: 'Function claim' }).fill('2.625');
  await page.getByRole('button', { name: 'Check proof', exact: true }).click();
  await expect(page.getByRole('status').last()).toContainText('Keep exploring');
  await page.getByRole('spinbutton', { name: 'Construct coefficient x^2' }).fill('1');
  for (const [i, h] of ['0.0625', '0.5625', '1.5625', '3.0625'].entries())
    await page.getByRole('textbox', { name: `Rectangle height ${i + 1}` }).fill(h);
  await page.getByRole('button', { name: 'Check proof', exact: true }).click();
  await expect(page.getByRole('status').last()).toContainText('Proof complete');
  await page.getByRole('textbox', { name: 'Rectangle height 2' }).fill('0');
  await page.getByRole('button', { name: 'Check proof', exact: true }).click();
  await expect(page.getByRole('status').last()).toContainText('Keep exploring');
});
test('all Boss connections work and offline notelets restore slice, trace, zoom, dial and dimension', async ({
  page,
  context,
}) => {
  await page.getByRole('button', { name: 'Boss', exact: true }).click();
  await page.getByRole('textbox', { name: 'Function claim' }).fill('1');
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Connection 2 of 3' })).toBeVisible();
  // Seed12345: y=x+1.
  await page.getByRole('spinbutton', { name: 'Construct coefficient x^0' }).fill('1');
  await page.getByRole('spinbutton', { name: 'Construct coefficient x^1' }).fill('1');
  for (const [x, y] of [
    ['0', '1'],
    ['1', '2'],
  ]) {
    await page.getByRole('textbox', { name: `Point output x=${x}` }).fill(y);
    await page.getByRole('checkbox', { name: `Include point x=${x}` }).check();
  }
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await page.getByRole('radio', { name: 'Rule option 2' }).check();
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await expect(page.getByRole('status').last()).toContainText('Keep exploring');
  await page.getByRole('radio', { name: 'Rule option 1' }).check();
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await expect(page.getByRole('status').last()).toContainText('Boss complete');
  await study(page, 'z=x^2+y^2');
  await predict(page, '2');
  await finish(page);
  await page.getByRole('slider', { name: 'Surface slice' }).fill('-1');
  await page.getByRole('slider', { name: 'Trace input' }).fill('2');
  await page.getByRole('slider', { name: 'Graph zoom' }).fill('1.5');
  await page.getByRole('button', { name: 'Shape', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('canvas[data-stage-canvas]')).toBeVisible();
  await page.getByRole('button', { name: 'Add notelet', exact: true }).click();
  const stage = page.locator('[data-anchor-id="stage"]');
  await stage.scrollIntoViewIfNeeded();
  const b = (await stage.boundingBox())!;
  await page.mouse.click(b.x + 120, b.y + 90);
  await page.getByRole('textbox', { name: 'Notelet text' }).fill('Compare this surface slice');
  await page.getByRole('button', { name: 'Save notelet', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Your notelet', exact: true })).not.toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'A rule becomes a place.' })).toBeVisible();
  await page.getByRole('button', { name: /Open notelet summary/ }).click();
  await page.getByRole('button', { name: /Jump to context/ }).click();
  await expect(page.getByRole('slider', { name: 'Surface slice' })).toHaveValue('-1');
  await expect(page.getByRole('slider', { name: 'Trace input' })).toHaveValue('2');
  await expect(page.getByRole('slider', { name: 'Graph zoom' })).toHaveValue('1.5');
  await expect(stage).toHaveAttribute('data-dial', '1');
  await expect(page.locator('canvas[data-stage-canvas]')).toBeVisible();
});

test('linear comparison distinguishes crossings and parallel rules, and repeated root markers stay editable', async ({
  page,
}) => {
  await predict(page, '3');
  await page.getByRole('checkbox', { name: 'Compare a second line' }).check();
  await expect(page.getByRole('region', { name: 'Function construction controls' })).toContainText(
    'Line crossing ≈ (1, 3)',
  );
  await expect(page.locator('[data-entity-id="crossing"]')).toHaveAttribute('opacity', '1');
  await expect(page.locator('.tk-compare').first()).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Second slope' }).fill('2');
  await expect(page.getByRole('region', { name: 'Function construction controls' })).toContainText(
    'Parallel distinct lines',
  );
  await page.getByRole('button', { name: 'Prove', exact: true }).click();
  await page.getByRole('combobox', { name: 'Function challenge' }).selectOption('roots');
  await page.getByRole('spinbutton', { name: 'Root marker 1' }).fill('2');
  await page.getByRole('spinbutton', { name: 'Root marker 2' }).fill('2');
  await expect(page.getByRole('button', { name: 'Prove', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Check proof', exact: true }).click();
  await expect(page.getByRole('status').last()).toContainText('Keep exploring');
});
