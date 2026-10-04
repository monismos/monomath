import { chromium } from '@playwright/test';
const browser = await chromium.launch();
for (const width of [1440, 360]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
  await page.addInitScript(() =>
    localStorage.setItem(
      'monomath-settings',
      JSON.stringify({
        state: { dimension: '2d', mascot: 'quiet', tutorialComplete: true, reducedMotion: true },
        version: 1,
      }),
    ),
  );
  for (const route of ['fractions', 'equations', 'philosophy']) {
    await page.goto(`http://127.0.0.1:5173/#${route}`);
    await page.waitForLoadState('networkidle');
    if (route === 'philosophy') await page.locator('main h1').waitFor({ timeout: 15000 });
    if (route === 'equations')
      await page
        .getByRole('img', { name: /graph|curve|relation|surface/i })
        .first()
        .waitFor({ timeout: 15000 })
        .catch(() => {});
    await page.screenshot({ path: `docs/m4-${route}-${width}.png`, fullPage: true });
  }
  await page.close();
}
await browser.close();
