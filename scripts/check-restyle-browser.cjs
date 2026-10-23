// Guest visual smoke checks; not native-device or authenticated UI verification.
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.RESTYLE_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
    args: ['--no-sandbox'],
  });
  const errors = [];
  fs.mkdirSync('generated-artifacts/restyle', { recursive: true });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(90000);
    page.on('pageerror', error => errors.push(error.message));
    const screens = [
      ['welcome', '/', 'Begin with Scripture.'],
      ['login', '/login?type=login', 'Welcome back'],
      ['register', '/login?type=register', 'Create your account'],
      ['today', '/today', 'Continue reading'],
      ['bible', '/bible?ref=John%203%3A16', 'John'],
      ['chat', '/new', 'GospelAI'],
      ['saved', '/saved', 'No saved verses yet.'],
      ['notes', '/notes', 'You haven’t saved any notes yet'],
      ['authors', '/library', 'Authors insight'],
      ['settings', '/settings', 'Settings'],
      ['support', '/support', 'Support GospelAI'],
    ];
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      await page.setViewportSize(viewport);
      for (const [name, path, text] of screens) {
        await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
        await page.getByText(text, { exact: false }).first().waitFor();
        await page.waitForFunction(() =>
          [...document.querySelectorAll('div')].some(node =>
            Object.keys(node).some(key => key.startsWith('__reactFiber'))));
        const overflow = await page.evaluate(() =>
          document.documentElement.scrollWidth > innerWidth + 1);
        assert.equal(overflow, false, `${name} must not overflow the viewport`);
        // A dark reading foundation must actually reach the rendered page.
        const darkSurface = await page.evaluate(() =>
          [...document.querySelectorAll('div')].some(node => {
            const color = getComputedStyle(node).backgroundColor;
            const bounds = node.getBoundingClientRect();
            return color === 'rgb(10, 16, 19)' && bounds.width > innerWidth / 2 &&
              bounds.height > innerHeight / 2;
          }));
        assert.equal(darkSurface, true, `${name} must use the shared dark foundation`);
        if (name === 'today') {
          const verse = page.getByRole('button', { name: /^Open .+ in the Bible$/ });
          await verse.scrollIntoViewIfNeeded();
          assert.equal(await verse.locator('img').evaluate(img => img.complete && img.naturalWidth > 0), true);
          const cardBox = await verse.boundingBox();
          const imageBox = await verse.locator('img').boundingBox();
          assert.ok(Math.abs(cardBox.width - imageBox.width) <= 2 &&
            Math.abs(cardBox.height - imageBox.height) <= 2,
          'Editorial image fills the card, rather than using intrinsic image dimensions');
          const share = page.getByRole('button', { name: 'Share verse of the day', exact: true });
          const box = await share.boundingBox();
          assert.ok(box.width >= 44 && box.height >= 44, 'Scripture share has a 44px tap target');
        }
        await page.screenshot({ path: `generated-artifacts/restyle/${name}-${viewport.width}.jpg` });
        console.log(`PASS ${name} dark surface, no page overflow ${viewport.width}x${viewport.height}`);
      }
      await page.goto(`${base}/today`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await page.getByRole('button', { name: 'Authors insight', exact: true }).waitFor();
      await page.screenshot({ path: `generated-artifacts/restyle/drawer-${viewport.width}.jpg` });
    }
    assert.deepEqual(errors, [], 'No uncaught browser errors');
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
