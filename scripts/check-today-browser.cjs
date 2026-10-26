const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const base = process.env.STUDY_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 402, height: 874 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/api/ideas', route => route.fulfill({ json: { ideas: [] } }));
  await context.route('**/api/chat', route => route.fulfill({ json: { reply: 'Bottom navigation test reply.' } }));
  const nav = () => page.getByLabel('Main navigation', { exact: true }).filter({ visible: true });
  const shortcut = name => nav().getByRole('button', { name, exact: true });
  const button = name => page.getByRole('button', { name, exact: true });
  const checkSelected = async name => {
    await shortcut(name).waitFor();
    assert.equal(await shortcut(name).getAttribute('aria-current'), 'page');
    assert.equal(await nav().locator('[aria-current="page"]').count(), 1);
  };
  try {
    await page.goto(`${base}/today`, { waitUntil: 'networkidle' });
    await button('Continue reading Genesis 1:1').waitFor();
    await checkSelected('Today');
    const menu = await button('Open navigation').boundingBox();
    assert.ok(menu.x > 300, 'Today drawer action is on the right');
    for (const name of ['Today', 'Bible', 'Ask GospelAI', 'Saved']) {
      const box = await shortcut(name).boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44 && box.y + box.height <= 874);
    }
    await shortcut('Bible').click();
    await page.waitForURL(url => url.pathname === '/bible');
    await checkSelected('Bible');
    await page.goto(`${base}/bible?ref=John%203%3A16&jump=bottom-nav-test`, { waitUntil: 'networkidle' });
    await button('Open actions for John 3:16').waitFor();
    await shortcut('Today').click();
    await button('Continue reading John 3:16').waitFor();
    await button('Continue reading John 3:16').click();
    await button('Open actions for John 3:16').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('ref'), 'John 3:16');
    await shortcut('Saved').click();
    await page.waitForURL(url => url.pathname === '/saved');
    await checkSelected('Saved');
    await shortcut('Ask GospelAI').click();
    await page.waitForURL(url => url.pathname === '/new');
    await checkSelected('Ask GospelAI');
    await page.getByRole('textbox', { name: 'Write a message' }).fill('Bottom navigation test');
    await button('Send message').click();
    await page.getByText('Bottom navigation test reply.', { exact: true }).waitFor();
    await checkSelected('Ask GospelAI');
    const chatUrl = page.url();
    await shortcut('Ask GospelAI').click();
    assert.equal(page.url(), chatUrl, 'Selected chat shortcut retains the current conversation');
    await shortcut('Today').click();
    await checkSelected('Today');
    await button('Share verse of the day').waitFor();
    assert.equal(await page.getByText('Seven days in the Word', { exact: true }).count(), 0);
    assert.equal(await button('Start plan').count(), 0);
    assert.equal(await page.getByText('Reset plan progress', { exact: true }).count(), 0);
    await page.getByRole('link', { name: 'Authors insight: Read Christian authors' }).scrollIntoViewIfNeeded();
    const footerBefore = await shortcut('Today').boundingBox();
    assert.ok(footerBefore.y > 750, 'Navigation stays below the scroll content');
    await shortcut('Today').click();
    await button('Open navigation').click();
    const search = page.getByRole('textbox', { name: 'Search conversation history' });
    await search.waitFor();
    const searchBox = await search.boundingBox();
    assert.ok(searchBox.x > 0, 'Drawer opens from the right');
    await button('Notes').click();
    await page.waitForURL(url => url.pathname === '/notes');
    await nav().waitFor();
    assert.equal(await nav().locator('[aria-current="page"]').count(), 0);
    await shortcut('Today').click();
    for (const width of [320, 402, 1024]) {
      await page.setViewportSize({ width, height: 874 });
      await page.reload({ waitUntil: 'networkidle' });
      await button('Continue reading John 3:16').waitFor();
      for (const name of ['Today', 'Bible', 'Ask GospelAI', 'Saved']) {
        const box = await shortcut(name).boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
      }
      const overflow = await page.evaluate(() => ({
        viewport: innerWidth, width: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll('body *')].map(e => ({
          text: e.textContent.slice(0, 50), x: e.getBoundingClientRect().x, width: e.getBoundingClientRect().width,
        })).filter(e => e.x >= innerWidth || e.width > innerWidth + 1).slice(0, 15),
      }));
      assert.ok(overflow.width <= width, JSON.stringify(overflow));
      await mkdir('generated-artifacts/today', { recursive: true });
      await page.screenshot({ path: `generated-artifacts/today/${width}.png` });
    }
    const orb = page.getByTestId('today-ambient-primary');
    await orb.waitFor();
    const beforeMotion = await orb.evaluate(element => getComputedStyle(element).transform);
    await page.waitForTimeout(1200);
    const afterMotion = await orb.evaluate(element => getComputedStyle(element).transform);
    assert.notEqual(afterMotion, beforeMotion, 'Today background subtly animates without reduced-motion preference');
    const reducedContext = await browser.newContext({ viewport: { width: 402, height: 874 }, reducedMotion: 'reduce' });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto(`${base}/today`, { waitUntil: 'networkidle' });
    await reducedPage.getByRole('button', { name: 'Continue reading Genesis 1:1' }).waitFor();
    const reducedOrb = reducedPage.getByTestId('today-ambient-primary');
    await reducedOrb.waitFor();
    const reducedBefore = await reducedOrb.evaluate(element => getComputedStyle(element).transform);
    await reducedPage.waitForTimeout(1200);
    const reducedAfter = await reducedOrb.evaluate(element => getComputedStyle(element).transform);
    assert.equal(reducedAfter, reducedBefore, 'reduced motion stops the ambient animation on cold launch');
    await reducedContext.close();
    assert.deepEqual(errors, []);
    console.log('PASS Today phone/tablet layouts, persistent navigation, exact reading position, visible motion, and reduced-motion cold launch');
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
