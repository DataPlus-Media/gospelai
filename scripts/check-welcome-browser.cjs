// The browser root is now the public site; native welcome presentation is unchanged.
// Check both cold-start reduced motion and the interactive reference controls.
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const base = process.env.WELCOME_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
    args: ['--no-sandbox'],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 320, height: 568 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(90000);
    page.on('pageerror', error => { throw error; });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.getByText('Read Scripture.', { exact: false }).first().waitFor();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('div')].some(node =>
        Object.keys(node).some(key => key.startsWith('__reactFiber'))),
    );
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 568, height: 320 },
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > innerWidth + 1,
      );
      assert.equal(overflow, false, `Homepage should not overflow at ${viewport.width}px`);
      const automaticMotion = await page.evaluate(() =>
        document.getAnimations().some(animation =>
          animation.playState === 'running' && animation.effect?.getTiming().duration !== 0,
        ),
      );
      assert.equal(automaticMotion, false, 'The homepage should remain still with reduced motion enabled');
      console.log(`PASS reduced-motion homepage ${viewport.width}x${viewport.height}`);
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: 'Pause decorative animation' }).click();
    assert.equal(await page.locator('.rail-track').first().evaluate(el =>
      getComputedStyle(el).animationPlayState), 'paused');
    await page.getByRole('button', { name: 'Resume decorative animation' }).click();
    assert.equal(await page.locator('.rail-track').first().evaluate(el =>
      getComputedStyle(el).animationPlayState), 'running');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.rail-track').first().evaluate(el =>
      getComputedStyle(el).animationName), 'none');
    await page.getByRole('button', { name: 'Toggle colour theme' }).click();
    assert.equal(await page.locator('.gospel-marketing').getAttribute('data-theme'), 'light');
    await page.reload();
    await page.waitForFunction(() =>
      document.querySelector('.gospel-marketing')?.getAttribute('data-theme') === 'light');
    await page.getByRole('button', { name: 'Next screen' }).click();
    assert.equal(await page.locator('output').innerText(), 'Saved');
    await page.getByRole('button', { name: 'Previous screen' }).click();
    assert.equal(await page.locator('output').innerText(), 'Ask GospelAI');
    console.log('PASS pause/resume, live reduced motion, persistent theme, and phone carousel');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
