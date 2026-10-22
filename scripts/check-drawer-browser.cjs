const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 402, height: 874 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Isolated test data and transport; no live AI calls or existing user records.
  await context.route('**/api/ideas', route => route.fulfill({ json: { ideas: [{ title: 'Test', text: 'Test idea' }] } }));
  await context.route('**/api/chat', route => route.fulfill({ json: { reply: 'Automated drawer navigation test reply.' } }));
  const button = name => page.getByRole('button', { name, exact: true });
  const open = async () => {
    await button('Open navigation').click();
    await page.getByRole('textbox', { name: 'Search conversation history' }).waitFor();
    await page.waitForTimeout(400); // Let the drawer's opening transition settle.
  };
  const closed = () => page.waitForFunction(() => {
    const search = document.querySelector('[aria-label="Search conversation history"]');
    return !search || !!search.closest('[aria-hidden="true"]') || search.getBoundingClientRect().right <= 0;
  });
  const route = async (label, path) => {
    await open();
    await button(label).click();
    await page.waitForURL(url => url.pathname === path);
    await closed();
    await open();
    assert.equal(await button(label).getAttribute('aria-current'), 'page');
    await button(label).click(); // Selecting the current page must also close.
    await closed();
  };
  try {
    if (process.argv.includes('--auth-only')) {
      await page.goto(`${base}/today`, { waitUntil: 'networkidle' });
      await open();
      await button('Sign in').click();
      await page.waitForURL(url => url.pathname === '/login' && url.searchParams.get('type') === 'login');
      await button('Continue with Apple').waitFor();
      await button('Continue with Google').waitFor();
      await page.goto(`${base}/today`, { waitUntil: 'networkidle' });
      await open();
      await button('Create account').click();
      await page.waitForURL(url => url.pathname === '/login' && url.searchParams.get('type') === 'register');
      await button('Continue with Apple').waitFor();
      await button('Continue with Google').waitFor();
      assert.deepEqual(errors, []);
      console.log('PASS guest sign-in and registration routes show Apple and Google OAuth; no browser errors');
      return;
    }
    await page.goto(`${base}/today`, { waitUntil: 'networkidle' });
    await page.getByText('Continue reading', { exact: true }).waitFor();
    for (const [label, path] of [
      ['Bible', '/bible'], ['Authors insight', '/library'], ['Saved verses', '/saved'],
      ['Notes', '/notes'], ['Support Us', '/support'], ['Today', '/today'],
    ]) await route(label, path);
    console.log('PASS grouped routes, current-page selection and drawer dismissal including Bible listener');

    await page.goto(`${base}/bible`, { waitUntil: 'networkidle' });
    await open();
    await button('GospelAI home, go to Today').click();
    await page.waitForURL(url => url.pathname === '/today');
    await closed();

    await open();
    await button('Start a new conversation').click();
    await closed();
    await open();
    await button('GospelAI home, go to Today').click();
    await page.waitForURL(url => url.pathname === '/today');
    await closed();
    console.log('PASS GospelAI logo returns to Today from Bible and chat');

    await open();
    await button('Start a new conversation').click();
    await closed();
    await page.getByRole('textbox', { name: 'Message GospelAI. Editable draft' }).fill('Drawer test conversation');
    await button('Send message').click();
    await page.getByText('Automated drawer navigation test reply.', { exact: true }).waitFor();
    await page.goto(`${base}/today`, { waitUntil: 'networkidle' });
    await open();
    const search = page.getByRole('textbox', { name: 'Search conversation history' });
    await search.fill('no-such-conversation');
    await page.getByText('No matching conversations', { exact: true }).waitFor();
    await button('Clear conversation search').click();
    await button('Options for Drawer test conversation').click();
    assert.equal(new URL(page.url()).pathname, '/today', 'Options must not open the conversation');
    await button('Rename conversation').click();
    await page.getByPlaceholder('Conversation title').fill('Evening reflections');
    await page.getByText('Save name', { exact: true }).click();
    await button('Options for Evening reflections').waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    await open();
    await button('Options for Evening reflections').waitFor();
    console.log('PASS local conversation search, options propagation, rename and reload persistence');

    await button('Options for Evening reflections').click();
    await button('Delete conversation').click();
    await page.getByText('Keep it', { exact: true }).click();
    await button('Evening reflections. Hold for conversation options.').click();
    await closed();
    await page.getByText('Automated drawer navigation test reply.', { exact: true }).waitFor();
    await page.goto(`${base}/today`, { waitUntil: 'networkidle' });
    await open();
    await button('Options for Evening reflections').click();
    await button('Delete conversation').click();
    await button('Delete').click();
    await page.getByText('Your conversations will appear here', { exact: true }).waitFor();
    await button('Today').click();
    await closed();
    await page.reload({ waitUntil: 'networkidle' });
    await open();
    await page.getByText('Your conversations will appear here', { exact: true }).waitFor();
    console.log('PASS cancel deletion retains messages; explicit deletion removes the isolated test conversation persistently');

    await mkdir('generated-artifacts/drawer', { recursive: true });
    await page.screenshot({ path: 'generated-artifacts/drawer/phone.png' });
    await page.setViewportSize({ width: 320, height: 568 });
    await button('Support Us').scrollIntoViewIfNeeded();
    const small = await button('Support Us').boundingBox();
    assert.ok(small && small.x >= 0 && small.x + small.width <= 320);
    await button('Support Us').click();
    await closed();
    await open();
    await page.screenshot({ path: 'generated-artifacts/drawer/small-phone.png' });
    await page.setViewportSize({ width: 1024, height: 768 });
    const todayBox = await button('Today').boundingBox();
    assert.ok(todayBox && todayBox.x + todayBox.width <= 420);
    await page.screenshot({ path: 'generated-artifacts/drawer/tablet.png' });
    console.log('PASS small-phone scrolling, tablet width cap and reachable guest footer');

    await button('Sign in').click();
    await page.waitForURL(url => url.pathname === '/login' && url.searchParams.get('type') === 'login');
    await button('Continue with Apple').waitFor();
    await button('Continue with Google').waitFor();
    await page.goto(`${base}/today`, { waitUntil: 'networkidle' });
    await open();
    await button('Create account').click();
    await page.waitForURL(url => url.pathname === '/login' && url.searchParams.get('type') === 'register');
    await button('Continue with Apple').waitFor();
    await button('Continue with Google').waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS guest sign-in and registration routes show Apple and Google OAuth; no browser errors');
  } catch (error) {
    await mkdir('generated-artifacts/drawer', { recursive: true });
    await page.screenshot({ path: 'generated-artifacts/drawer/failure.png' });
    console.error('Failed at', page.url());
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
