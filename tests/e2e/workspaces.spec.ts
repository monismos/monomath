import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

async function setup(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('monomath-settings'))
      localStorage.setItem(
        'monomath-settings',
        JSON.stringify({
          version: 1,
          state: { dimension: '2d', mascot: 'off', tutorialComplete: true },
        }),
      );
  });
}
async function equation(page: Page, source: string, mode = 'curve') {
  await page.getByLabel('Equation or expression').fill(source);
  await expect(page.locator('[data-graph-source]')).toHaveAttribute('data-graph-source', source);
  await expect(page.locator('[data-graph-source]')).toHaveAttribute('data-graph-mode', mode);
  await expect(
    page.getByText('Sampling your expression locally…', { exact: true }),
  ).not.toBeVisible();
}
async function downloadJSON(page: Page, button: import('@playwright/test').Locator) {
  const ready = page.waitForEvent('download');
  await button.click();
  const download = await ready;
  const path = await download.path();
  expect(path).not.toBeNull();
  return JSON.parse(await readFile(path!, 'utf8'));
}
test('real equation curves, poles, contours and surfaces share useful study controls', async ({
  page,
}) => {
  await setup(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#equations');
  await equation(page, 'y=1/x');
  await expect(page.locator('svg[role=img] polyline')).toHaveCount(2);
  await page.getByLabel('Numeric trace x coordinate').fill('0');
  await expect(page.locator('output')).toHaveText(/undefined.*Division by zero/);
  await equation(page, 'x^2+y^2=4', 'relation');
  expect(await page.locator('svg[role=img] polyline').count()).toBeGreaterThan(50);
  await expect(page.getByText(/Contours are a finite-grid approximation/)).toBeVisible();
  await equation(page, 'z=sin(x)*cos(y)', 'surface');
  await expect(page.getByLabel('Slice y coordinate')).toBeVisible();
  await page.getByLabel('Slice y coordinate').fill('1');
  await expect(page.getByRole('heading', { name: 'Slice through y=1' })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('canvas[data-stage-canvas]')).toBeVisible();
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect(page.getByRole('img', { name: /Surface heatmap/ })).toBeVisible();
  await page.getByLabel('Equation or expression').fill('x^2+y^2+z^2=1');
  await expect(page.getByRole('alert')).toHaveText(/General implicit 3D.*last valid graph/);
  await expect(page.locator('[data-graph-source]')).toHaveAttribute(
    'data-graph-source',
    'z=sin(x)*cos(y)',
  );
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
test('a graph note restores parameters, window, trace, dimension and its domain anchor after reload', async ({
  page,
  isMobile,
}) => {
  await setup(page);
  await page.goto('/#equations');
  await equation(page, 'y=a*x^2+b*x+c');
  await page.getByLabel('Numeric parameter a').fill('2.5');
  await page.getByLabel('Numeric parameter b').fill('-.75');
  await page.getByLabel('Numeric parameter c').fill('.2');
  await page.getByRole('button', { name: 'Pan view right', exact: true }).click();
  await page.getByLabel('Numeric trace x coordinate').fill('1.5');
  await expect(page.locator('output')).toHaveText('y = 4.7');
  await expect(page.getByRole('img', { name: /Sampled graph on labelled/ }).getByText('7', { exact: true })).toBeVisible();
  await page.getByLabel('Equation or expression').fill('foo(x)');
  await expect(page.getByRole('alert')).toHaveText(/not supported.*last valid graph/);
  await page.getByLabel('Equation or expression').blur();
  const plot = page.getByRole('img', { name: /Sampled graph on labelled/ });
  await plot.scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const rect = (await plot.boundingBox())!;
  const point = { x: rect.x + rect.width * 0.55, y: rect.y + rect.height * 0.45 };
  expect(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-anchor-id="stage"]'), point)).toBe(true);
  if (isMobile) {
    await page.evaluate(({ x, y }) => {
      document.elementFromPoint(x, y)?.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 91,
          pointerType: 'touch',
          isPrimary: true,
          button: 0,
          clientX: x,
          clientY: y,
        }),
      );
    }, point);
    await expect(page.getByRole('dialog', { name: 'Your notelet' })).toBeVisible();
    await page.evaluate(() =>
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 91,
          pointerType: 'touch',
          isPrimary: true,
          button: 0,
        }),
      ),
    );
  } else {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await expect(page.getByRole('dialog', { name: 'Your notelet' })).toBeVisible();
    await page.mouse.up();
  }
  await page
    .getByRole('textbox', { name: 'Notelet text' })
    .fill('The coefficient bends the graph while the window stays mine.');
  await page.getByRole('button', { name: 'Save notelet', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Your notelet' })).not.toBeVisible();
  await page.reload();
  await equation(page, 'y=sin(x)');
  await page.getByRole('button', { name: /Open notelet summary/ }).click();
  const summary = page.getByRole('dialog', { name: 'Your little collection of understanding' });
  const exported = await downloadJSON(
    page,
    summary.getByRole('button', { name: 'Export JSON', exact: true }),
  );
  expect(exported.notes[0]).toMatchObject({
    context: {
      labId: 'equations',
      graph: {
        version: 1,
        source: 'y=a*x^2+b*x+c',
        parameters: { a: 2.5, b: -0.75, c: 0.2 },
        viewport: { xmin: -3, xmax: 7 },
        traceX: 1.5,
      },
    },
    anchor: { type: 'world' },
  });
  expect(exported.notes[0].anchor.entityId).toMatch(/^graph-.+:plot$/);
  expect(exported.notes[0].anchor.p.every(Number.isFinite)).toBe(true);
  await summary.getByRole('button', { name: /Jump to context/ }).click();
  await expect(page.locator('[data-graph-source]')).toHaveAttribute(
    'data-graph-source',
    'y=a*x^2+b*x+c',
  );
  await expect(page.getByLabel('Numeric parameter a')).toHaveValue('2.5');
  await expect(page.getByLabel('Numeric parameter b')).toHaveValue('-0.75');
  await expect(page.getByLabel('Numeric parameter c')).toHaveValue('0.2');
  await expect(page.getByLabel('Numeric trace x coordinate')).toHaveValue('1.5');
  await page.getByText('Window bounds', { exact: true }).click();
  await expect(page.getByLabel('xmin', { exact: true })).toHaveValue('-3');
  await expect(page.getByLabel('xmax', { exact: true })).toHaveValue('7');
  await expect(page.getByRole('button', { name: '2D', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('[data-note-id]')).toBeVisible();
});
test('the equation parser, sampling worker and graph renderer work after an offline reload', async ({
  page,
  context,
}) => {
  await setup(page);
  await page.goto('/#equations');
  await equation(page, 'y=sin(x)');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await equation(page, 'y=sqrt(x)');
  await expect(page.getByRole('img', { name: /Sampled graph on labelled/ })).toBeVisible();
  await page.getByLabel('Numeric trace x coordinate').fill('4');
  await expect(page.locator('output')).toHaveText('y = 2');
  await expect(page.getByRole('alert')).not.toBeVisible();
});
test('Philosophy authorship, private reflection and JSON backup persist with an atomic import', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/#philosophy');
  const reader = page.locator('[data-anchor-id^="philosophy-lesson-"]');
  await page.getByRole('button', { name: 'Add a lesson', exact: true }).click();
  await page.getByLabel('Lesson title', { exact: true }).fill('Choosing with care');
  await page.getByLabel(/^Opening question/).fill('Which reason deserves more attention?');
  await page.getByLabel(/^Tags, separated by commas/).fill('ethics, choices');
  await page
    .getByLabel(/^Lesson body/)
    .fill(
      '# A considered choice\n\nWrite the reason before defending the decision.\n\n- Notice the assumption.\n- Consider who is affected.',
    );
  await page.getByRole('button', { name: 'Save lesson', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit lesson', exact: true })).toBeVisible();
  await page
    .getByLabel('Your private reflection')
    .fill('My private reflection is separate from the lesson.');
  await page.getByRole('button', { name: 'Save reflection', exact: true }).click();
  await expect(page.getByText('Private reflection saved locally.', { exact: true })).toBeVisible();
  const exported = await downloadJSON(
    page,
    page.getByRole('button', { name: 'Export JSON', exact: true }),
  );
  expect(exported).toMatchObject({
    version: 1,
    kind: 'monomath-philosophy',
    lessons: [{ title: 'Choosing with care', author: 'Airator', tags: ['ethics', 'choices'] }],
  });
  expect(JSON.stringify(exported)).not.toContain('My private reflection');
  await page.reload();
  await expect(
    reader.getByRole('heading', { name: 'Choosing with care', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Your private reflection')).toHaveValue(
    'My private reflection is separate from the lesson.',
  );
  await page.getByRole('button', { name: 'Delete lesson Choosing with care', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete lesson', exact: true })
    .click();
  await expect(
    reader.getByRole('heading', { name: 'Choosing with care', exact: true }),
  ).not.toBeVisible();
  await page.getByLabel('Import Philosophy JSON').setInputFiles({
    name: 'my-philosophy.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await page.getByRole('button', { name: 'Import lessons now', exact: true }).click();
  await expect(page.getByText(/1 added, 0 replaced, 0 kept/)).toBeVisible();
  await page.getByLabel('Import Philosophy JSON').setInputFiles({
    name: 'bad-philosophy.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        kind: 'monomath-philosophy',
        lessons: [{ title: 'Invalid' }],
      }),
    ),
  });
  await expect(page.getByText(/invalid lesson.*Nothing was imported/)).toBeVisible();
  await page.reload();
  await expect(
    reader.getByRole('heading', { name: 'Choosing with care', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Your private reflection')).toHaveValue(
    'My private reflection is separate from the lesson.',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
