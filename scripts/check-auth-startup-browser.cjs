// Browser readiness/recovery checks, not native or live-account verification.
const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const base = process.env.AUTH_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
    args: ['--no-sandbox'],
  });
  try {
    for (const type of ['login', 'register']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      let release;
      const held = new Promise(resolve => { release = resolve; });
      // Hold the SDK download to model a cold, stalled startup with no sessions.
      await context.route(/\/npm\/@clerk\/clerk-js@/, async route => {
        await held;
        await route.continue().catch(() => {});
      });
      const page = await context.newPage();
      await page.goto(`${base}/login?type=${type}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      const primary = page.getByRole('button', { name: type === 'login' ? 'Sign in' : 'Create account', exact: true });
      await expect(page.getByText(/Connecting to the sign-in service/)).toBeVisible({ timeout: 60000 });
      // Wait for hydration before typing (Expo's static shell is disposable).
      await page.waitForFunction(() => {
        const node = document.querySelector('[aria-label="Email address"]');
        return node && Object.keys(node).some(key => key.startsWith('__reactFiber'));
      });
      await page.getByRole('textbox', { name: 'Email address', exact: true }).fill('synthetic@example.invalid');
      await expect(primary).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Continue with Apple' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();
      await expect(page.getByText(/Sign-in is taking longer than expected/)).toBeVisible({ timeout: 20000 });
      await expect(page.getByRole('button', { name: 'Retry sign-in', exact: true })).toBeEnabled();
      await expect(page.getByText(/Service:|Platform:|Build:|Startup:|environment=/i)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Continue as a guest' })).toBeEnabled();
      release();
      await expect(primary).toBeEnabled({ timeout: 60000 });
      await expect(page.getByText(/Sign-in is taking longer than expected/)).toHaveCount(0);
      console.log(`PASS ${type}: unloaded, editable details, timeout recovery actions, delayed readiness`);

      // Stall a second cold start, then prove the retry button reloads the app.
      await context.unroute(/\/npm\/@clerk\/clerk-js@/);
      let releaseAgain;
      const heldAgain = new Promise(resolve => { releaseAgain = resolve; });
      await context.route(/\/npm\/@clerk\/clerk-js@/, async route => {
        await heldAgain;
        await route.continue().catch(() => {});
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('button', { name: 'Retry sign-in', exact: true })).toBeVisible({ timeout: 25000 });
      await context.unroute(/\/npm\/@clerk\/clerk-js@/);
      const navigation = page.waitForEvent('framenavigated', frame => frame === page.mainFrame());
      await page.getByRole('button', { name: 'Retry sign-in', exact: true }).click();
      await navigation;
      releaseAgain();
      await expect(primary).toBeEnabled({ timeout: 60000 });
      await expect(page.getByRole('textbox', { name: 'Email address', exact: true })).toHaveValue('');
      console.log(`PASS ${type}: retry reloads, clears form, restores ready controls`);

      let requests = 0;
      await context.route(/\/client\/sign_(ins|ups)(\?|$)/, async route => {
        requests++;
        // No account creation or real credentials; bounded fake API failure.
        await new Promise(resolve => setTimeout(resolve, 600));
        await route.fulfill({ status: 422, contentType: 'application/json',
          body: JSON.stringify({ errors: [{ code: 'form_password_incorrect', message: 'Check your details.' }] }) });
      });
      await page.getByRole('textbox', { name: 'Email address', exact: true }).fill('synthetic@example.invalid');
      await page.getByLabel('Password', { exact: true }).fill('Synthetic-only-123!');
      await primary.click();
      await expect(page.getByText('Please wait…', { exact: true })).toBeVisible();
      await expect(page.getByText('Please wait…', { exact: true })).toHaveCount(0, { timeout: 20000 });
      assert.ok(requests > 0, 'email submission must call Clerk');
      await expect(primary).toBeEnabled();
      for (const name of ['Continue with Apple', 'Continue with Google']) {
        const before = requests;
        await page.getByRole('button', { name, exact: true }).click();
        await expect(page.getByText('Please wait…', { exact: true })).toHaveCount(0, { timeout: 20000 });
        await expect.poll(() => requests).toBeGreaterThan(before);
        await expect(primary).toBeEnabled();
      }
      console.log(`PASS ${type}: email and both provider entry points submit and recover after errors`);
      await page.getByRole('button', { name: 'Continue as a guest', exact: true }).click();
      await expect(page).toHaveURL(/today/);
      console.log(`PASS ${type}: guest study remains reachable`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
