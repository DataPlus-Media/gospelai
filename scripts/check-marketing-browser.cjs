const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');

const base = process.env.MARKETING_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
const routes = [
  ['/', 'Read Scripture.'],
  ['/features', 'From daily reading to deeper study.'],
  ['/ask', 'What would you ask?'],
  ['/authors-insight', 'Read alongside classic Christian voices.'],
  ['/support', 'Help us keep building GospelAI.'],
];

async function waitForClient(page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll('div')].some(node =>
      Object.keys(node).some(key => key.startsWith('__reactFiber'))),
  );
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
    args: ['--no-sandbox'],
  });
  const errors = [];
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(90000);
    page.on('pageerror', error => errors.push(error.message));

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 1000 },
    ]) {
      await page.setViewportSize(viewport);
      for (const [path, label] of routes) {
        await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
        await page.getByText(label, { exact: false }).first().waitFor();
        await waitForClient(page);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
          false,
          `${path} should not overflow at ${viewport.width}px`,
        );
        console.log(`PASS ${path} renders without horizontal overflow at ${viewport.width}px`);
      }
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/ask`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'The good shepherd' }).waitFor();
    await page.getByRole('button', { name: 'A lamp to my feet' }).click();
    await page.getByText('Psalm 119:105–112', { exact: true }).waitFor();
    await page.locator('summary').click();
    await page.locator('nav a[href="/authors-insight"]').click();
    await page.getByText('Read alongside classic Christian voices.', { exact: true }).waitFor();
    await page.getByRole('button', { name: /C\. H\. Spurgeon/ }).click();
    await page.getByText('C. H. Spurgeon', { exact: true }).last().waitFor();
    console.log('PASS mobile navigation, Ask examples, and Authors insight selection');

    await page.goto(`${base}/support`, { waitUntil: 'domcontentloaded' });
    await page.locator('main').getByText('Support GospelAI', { exact: true }).waitFor();
    const externalLinks = await page.locator('a[href]').evaluateAll(links =>
      links.map(link => link.href).filter(href => /^https?:/.test(href)),
    );
    assert.ok(externalLinks.every(href => !href.includes('stripe.com')), 'Support must not expose stale Stripe URLs');
    console.log('PASS support page has no stale Stripe links');
    const eligibilityNotice = page.getByText(/Online checkout is unavailable until Revolut eligibility is\s+confirmed/);
    if (await eligibilityNotice.count()) {
      for (const name of ['One-time support', 'Monthly support']) {
        assert.equal(await page.getByRole('link', { name, exact: true }).getAttribute('aria-disabled'), 'true');
      }
      console.log('PASS Revolut checkout controls remain disabled without eligibility approval');
    }

    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    if (!await page.locator('details').evaluate(el => el.open)) await page.locator('summary').click();
    await page.getByRole('link', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/login' && url.searchParams.get('type') === 'login');
    await page.getByText('Welcome back', { exact: true }).waitFor();
    await page.goBack();
    await page.getByRole('heading', { name: /Read Scripture/ }).waitFor();
    if (!await page.locator('details').evaluate(el => el.open)) await page.locator('summary').click();
    await page.getByRole('link', { name: 'Create an account', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/login' && url.searchParams.get('type') === 'register');
    await page.getByText('Create your account', { exact: true }).waitFor();
    console.log('PASS sign-in and registration remain separate auth screens');

    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('footer a[href="/today"]').click();
    await page.getByText('Continue reading', { exact: true }).waitFor({ timeout: 60000 });
    console.log('PASS public homepage links into the functional Today study route');
    for (const [path, label] of [
      ['/bible', 'Genesis'], ['/new', 'GospelAI'],
      ['/saved', 'YOUR STUDY COLLECTION'], ['/notes', 'YOUR STUDY COLLECTION'],
      ['/library', 'Authors insight'],
    ]) {
      await page.goto(`${base}/features`, { waitUntil: 'domcontentloaded' });
      await page.locator(`footer a[href="${path}"]`).click();
      await page.getByText(label, { exact: false }).first().waitFor({ timeout: 60000 });
      assert.equal(await page.locator('.gospel-marketing').count(), 0);
      console.log(`PASS public link opens existing study experience ${path}`);
    }
    assert.deepEqual(errors, [], 'No uncaught browser errors');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
