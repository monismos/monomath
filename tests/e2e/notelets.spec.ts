import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
async function save(page: import('@playwright/test').Page, text: string) {
  await expect(page.getByRole('dialog', { name: 'Your notelet' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Notelet text' }).fill(text);
  await page.getByRole('button', { name: 'Save notelet', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Your notelet' })).not.toBeVisible();
}
test('hold on a button saves a note without firing its click; context survives reload', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Open notelet summary/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Open notelet summary/ })).toBeVisible();
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByRole('button', { name: 'Symbol', exact: true }).click();
  const button = page.getByRole('button', { name: 'Next step', exact: true });
  await button.scrollIntoViewIfNeeded();
  const rect = (await button.boundingBox())!;
  if (isMobile) {
    await button.dispatchEvent('pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientX: rect.x + 10,
      clientY: rect.y + 10,
    });
    await expect(page.getByRole('dialog', { name: 'Your notelet' })).toBeVisible();
    await button.dispatchEvent('pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
    });
  } else {
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await expect(page.getByRole('dialog', { name: 'Your notelet' })).toBeVisible();
    await page.mouse.up();
  }
  await expect(page.locator('[data-anchor-id="stage"]')).toHaveAttribute('data-step', '0');
  await save(page, 'A denominator tells me the size of the pieces.');
  await page.reload();
  await page.getByRole('button', { name: /Open notelet summary/ }).click();
  await expect(
    page.getByText('A denominator tells me the size of the pieces.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Jump to context/ }).click();
  await expect(page.locator('[data-anchor-id="stage"]')).toHaveAttribute('data-dial', '2');
  await expect(page.getByRole('button', { name: '2D', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
for (const count of [1, 2, 7, 40])
  test(`summary works with ${count} notelets`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Open notelet summary/ }).click();
    const notes = Array.from({ length: count }, (_, i) => ({
      id: `fixture-${i}`,
      text: `Thought ${i + 1}`,
      color: 'sun',
      createdAt: 1 + i,
      updatedAt: 1 + i,
      context: {
        step: 0,
        dial: 1,
        selection: null,
        problem: '3/4',
        labId: 'demo',
        route: 'workshop',
        screen: 'page',
        dimension: '2d',
        theme: 'bench',
      },
      anchor: { type: 'screen', nx: 0.5, ny: 0.5 },
    }));
    await page
      .getByRole('dialog', { name: 'Your little collection of understanding' })
      .locator('input[type=file]')
      .setInputFiles({
        name: 'notes.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({ version: 1, notes })),
      });
    await expect(
      page.getByRole('region', { name: 'Notelet carousel' }).getByRole('article'),
    ).toHaveCount(Math.min(count, 15));
    if (count > 1) {
      await page.getByRole('button', { name: 'Next notelet', exact: true }).click();
      await expect(page.getByText(`2 of ${count}`, { exact: true })).toBeVisible();
    }
    if (count === 40) await page.screenshot({ path: 'docs/carousel40.png' });
    await page.getByRole('button', { name: 'Delete notelet', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByText('Notelet restored', { exact: true })).toBeVisible();
  });
test('hold works over text, empty space, canvas, settings and carousel', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Open notelet summary/ })).toBeVisible();
  for (const area of ['text', 'empty', 'canvas', 'settings', 'carousel']) {
    let point = { x: 300, y: 180 };
    if (area === 'text') {
      const r = (await page
        .getByRole('heading', { name: 'Small pieces. Big picture.' })
        .boundingBox())!;
      point = { x: r.x + 12, y: r.y + 12 };
    }
    if (area === 'empty')
      point = { x: page.viewportSize()!.width - 60, y: page.viewportSize()!.height - 50 };
    if (area === 'canvas') {
      const r = (await page.locator('canvas[data-stage-canvas]').boundingBox())!;
      point = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    if (area === 'settings') {
      await page.getByRole('button', { name: 'Open settings', exact: true }).click();
      const r = (await page.getByRole('heading', { name: 'Make yourself at home' }).boundingBox())!;
      point = { x: r.x + 15, y: r.y + 15 };
    }
    if (area === 'carousel') {
      await page.getByRole('button', { name: /Open notelet summary/ }).click();
      const r = (await page
        .getByRole('heading', { name: 'Your little collection of understanding' })
        .boundingBox())!;
      point = { x: r.x + 12, y: r.y + 12 };
    }
    const cameraBefore =
      area === 'canvas'
        ? await page.locator('canvas[data-stage-canvas]').getAttribute('data-camera-position')
        : null;
    if (isMobile) {
      await page.evaluate(({ x, y }) => {
        document.elementFromPoint(x, y)?.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            pointerId: 1,
            pointerType: 'touch',
            isPrimary: true,
            button: 0,
            clientX: x,
            clientY: y,
          }),
        );
      }, point);
      await expect(page.getByRole('dialog', { name: 'Your notelet' })).toBeVisible();
      await page.evaluate(({ x, y }) => {
        window.dispatchEvent(
          new PointerEvent('pointerup', {
            bubbles: true,
            pointerId: 1,
            pointerType: 'touch',
            isPrimary: true,
            button: 0,
            clientX: x,
            clientY: y,
          }),
        );
      }, point);
    } else {
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      await expect(page.getByRole('dialog', { name: 'Your notelet' })).toBeVisible();
      await page.mouse.up();
    }
    if (area === 'canvas')
      await expect(page.locator('canvas[data-stage-canvas]')).toHaveAttribute(
        'data-camera-position',
        cameraBefore!,
      );
    await save(page, `A thought from ${area}`);
    if (area === 'settings' || area === 'carousel')
      await page.getByRole('button', { name: 'Close', exact: true }).click();
  }
  await expect(
    page.getByRole('button', { name: 'Open notelet summary, 5 notelets' }),
  ).toBeVisible();
});
test('keyboard creates a note and reduced-motion summary is flat', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Open notelet summary/ })).toBeVisible();
  await page.keyboard.press('n');
  await save(page, 'My keyboard thought');
  await page.keyboard.press('s');
  await expect(page.getByRole('region', { name: 'Notelet carousel' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Notelet 1 of 1' })).not.toHaveAttribute(
    'style',
    /rotateY/,
  );
});
