import { test, expect } from '@playwright/test';
test('learning actions, guide preferences and due Echoes persist', async ({ page, isMobile }) => {
  await page.clock.setFixedTime(new Date('2026-10-04T12:00:00+05:30'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore on my own', exact: true }).click();
  await page.getByRole('button', { name: '2D', exact: true }).click();
  for (const name of ['Thing', 'Shape', 'Symbol', 'Code'])
    await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Predict before the reveal' })).toBeVisible();
  await page.getByRole('button', { name: '1/4', exact: true }).click();
  await page.getByRole('button', { name: 'Check my guess', exact: true }).click();
  await page.getByRole('button', { name: 'A little hint', exact: true }).click();
  await page
    .getByRole('region', { name: 'Predict before the reveal' })
    .getByRole('button', { name: '3/4', exact: true })
    .click();
  await page.getByRole('button', { name: 'Check my guess', exact: true }).click();
  await page.keyboard.press('n');
  await page
    .getByRole('textbox', { name: 'Notelet text' })
    .fill('Equal pieces make the denominator meaningful.');
  await page.getByRole('button', { name: 'Save notelet', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Your notelet' })).not.toBeVisible();
  await page.getByRole('button', { name: /Open notelet summary/ }).click();
  await page.getByRole('button', { name: 'Star notelet', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await page.getByLabel('Your guide').selectOption('quiet');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await expect(page.getByLabel('Your guide')).toHaveValue('quiet');
  await page.getByLabel('Your guide').selectOption('off');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('[data-anchor-id="one-eyed-guide"]')).toHaveCount(0);
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem('monomath-progress')!).state,
  );
  expect(before.xp).toBe(13);
  expect(before.gems.demo.play).toBe(true);
  expect(before.rhythm.streak).toBe(1);
  expect(before.echoes).toHaveLength(2);
  await page.clock.setFixedTime(new Date('2026-10-05T12:01:00+05:30'));
  if (isMobile) await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Echoes', exact: true }).click();
  await page.getByRole('button', { name: /Notelet$/ }).click();
  await page.getByRole('button', { name: 'Reveal your note', exact: true }).click();
  await expect(
    page.getByText('Equal pieces make the denominator meaningful.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Good · keep it growing', exact: true }).click();
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem('monomath-progress')!).state,
  );
  expect(after.xp).toBe(21);
  expect(after.rhythm.streak).toBe(2);
  const noteEcho = after.echoes.find((e: { kind: string }) => e.kind === 'note');
  expect(noteEcho.schedule.box).toBe(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Echoes', exact: true })).toBeVisible();
  expect(
    (await page.evaluate(() => JSON.parse(localStorage.getItem('monomath-progress')!).state)).xp,
  ).toBe(21);
});
