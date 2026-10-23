// Browser checks are not native-device or live OAuth completion checks.
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const base = process.env.WELCOME_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
const guestName = 'Start exploring. Continue without an account.';

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
    args: ['--no-sandbox'],
  });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(90000); // Allow a cold Metro web bundle.
    page.on('pageerror', error => errors.push(error.message));
    const button = name => page.getByRole('button', { name, exact: true });
    const open = async () => {
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await button(guestName).waitFor({ timeout: 60000 });
      // Expo serves a static shell before replacing it with the client tree.
      // Do not start resizing/scrolling against that disposable server tree.
      await page.waitForFunction(label => {
        const node = document.querySelector(`[aria-label="${label}"]`);
        return node && Object.keys(node).some(key => key.startsWith('__reactFiber'));
      }, guestName, { timeout: 60000 });
    };
    const transforms = () => page.getByTestId('welcome-light-emerald').evaluate(el => getComputedStyle(el).transform);
    const checkLayout = async () => {
      await button('Continue with Google').scrollIntoViewIfNeeded();
      // Scrollable content must stay within the screen on both axes.
      const outside = await page.evaluate(() => {
        const controls = [...document.querySelectorAll('[role="button"]')];
        return controls.filter(el => {
          const r = el.getBoundingClientRect();
          return r.left < -1 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 2;
        }).map(el => el.textContent);
      });
      assert.deepEqual(outside, [], 'Buttons must not clip horizontally');
      assert.equal(await button('Continue with Apple').isVisible(), true);
      assert.equal(await button('Continue with Google').isVisible(), true);
      assert.equal(await page.getByText('Continue without an account.', { exact: false }).isVisible(), true);
    };
    await open();
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 568, height: 320 },
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(200);
      await checkLayout();
      console.log(`PASS scrollable welcome ${viewport.width}x${viewport.height}`);
    }
    await page.setViewportSize({ width: 320, height: 568 });
    // Double text sizes and line heights without scaling fixed containers.
    // This is a browser stress test, not proof of iOS/Android Dynamic Type.
    await page.evaluate(() => {
      const textNodes = [...document.querySelectorAll('div')].filter(el =>
        [...el.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()));
      for (const el of textNodes) {
        const css = getComputedStyle(el);
        el.style.fontSize = `${parseFloat(css.fontSize) * 2}px`;
        if (css.lineHeight !== 'normal') el.style.lineHeight = `${parseFloat(css.lineHeight) * 2}px`;
      }
    });
    await checkLayout();
    console.log('PASS doubled browser text remains scrollable with reachable controls');
    await open();
    const reduced = await transforms();
    await page.waitForTimeout(250);
    assert.equal(await transforms(), reduced);
    for (const el of await page.getByTestId('welcome-entrance').all()) {
      assert.equal(await el.evaluate(node => getComputedStyle(node).opacity), '1');
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(120);
    const moving = await transforms();
    await page.waitForTimeout(250);
    assert.notEqual(await transforms(), moving, 'Light should move when motion is allowed');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(120);
    const stopped = await transforms();
    await page.waitForTimeout(250);
    assert.equal(await transforms(), stopped);
    console.log('PASS initial and live reduced-motion preference, visible entrance content');

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(150);
    // Exercise React Native Web's AppState visibility bridge with a synthetic
    // event; this is not proof of a physical device background transition.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(120);
    const backgrounded = await transforms();
    await page.waitForTimeout(200);
    assert.equal(await transforms(), backgrounded);
    await page.evaluate(() => {
      delete document.visibilityState;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(150);
    const resumed = await transforms();
    await page.waitForTimeout(200);
    assert.notEqual(await transforms(), resumed);
    assert.equal(await page.getByTestId('welcome-light-emerald').evaluate(el =>
      getComputedStyle(el.parentElement).pointerEvents), 'none');
    console.log('PASS simulated browser AppState pause/resume and non-interactive light layers');

    // Link-as-child retains both modal modes. Navigation is independent of motion.
    for (const [label, type, title] of [
      ['Sign in', 'login', 'Welcome back'],
      ['Create account', 'register', 'Create your account'],
    ]) {
      await button(label).click();
      await page.waitForURL(url => url.pathname === '/login' && url.searchParams.get('type') === type);
      await page.getByText(title, { exact: true }).waitFor();
      // The stack can retain the welcome behind the modal; it must stay still.
      if (await page.getByTestId('welcome-light-emerald').count()) {
        await page.waitForTimeout(120);
        const unfocused = await transforms();
        await page.waitForTimeout(200);
        assert.equal(await transforms(), unfocused);
      }
      await page.goBack();
      await button(guestName).waitFor();
    }
    await button('Continue with Apple').waitFor();
    // Verify OAuth handoff without signing in or exposing credentials.
    let oauthStartCount = 0;
    await context.route(/.*clerk.*\/client\/sign_ins.*/, async route => {
      if (route.request().method() === 'POST') oauthStartCount += 1;
      await route.abort();
    });
    await button('Continue with Google').click();
    for (let attempt = 0; attempt < 50 && oauthStartCount < 1; attempt++) await page.waitForTimeout(100);
    assert.ok(oauthStartCount >= 1, 'Google must start the existing Clerk OAuth flow');
    const beforeApple = oauthStartCount;
    await button('Continue with Apple').click();
    for (let attempt = 0; attempt < 50 && oauthStartCount <= beforeApple; attempt++) await page.waitForTimeout(100);
    assert.ok(oauthStartCount > beforeApple, 'Apple must start the existing Clerk OAuth flow');
    console.log('PASS sign-in/register modes, web Apple/Google visibility and OAuth request handoff (aborted)');

    await open();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await button(guestName).click();
    await page.waitForURL(url => url.pathname === '/today');
    await page.getByText('Continue reading', { exact: true }).waitFor({ timeout: 60000 });
    assert.equal(await page.getByTestId('welcome-light-emerald').count(), 0);
    assert.equal(await page.getByTestId('welcome-light-gold').count(), 0);
    console.log('PASS guest enters Today while motion runs; welcome light layers unmount');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
