// Simulated API failures only; does not sign in or create accounts.
const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const base = process.env.AUTH_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
    args: ['--no-sandbox'],
  });
  try {
    for (const flow of ['email_sign_in', 'email_sign_up', 'oauth_google', 'oauth_apple']) {
      const context = await browser.newContext({
        viewport: { width: 402, height: 874 },
        permissions: ['clipboard-read', 'clipboard-write'],
      });
      let intercepted = 0;
      await context.route(/\/v1\/client\/sign_(ins|ups)(?:\?|$)/, async route => {
        if (route.request().method() !== 'POST') return route.continue();
        intercepted++;
        await route.fulfill({
          status: 422, contentType: 'application/json',
          body: JSON.stringify({ errors: [{
            code: 'form_param_format_invalid',
            message: 'PRIVATE_SERVER_MESSAGE',
            long_message: 'PRIVATE_SERVER_MESSAGE',
          }] }),
        });
      });
      const page = await context.newPage();
      await page.goto(`${base}/login?type=${flow === 'email_sign_up' ? 'register' : 'login'}`);
      const buttonName = flow === 'email_sign_in' ? 'Sign in'
        : flow === 'email_sign_up' ? 'Create account'
        : flow === 'oauth_google' ? 'Continue with Google' : 'Continue with Apple';
      const button = page.getByRole('button', { name: buttonName, exact: true });
      await expect(button).toBeEnabled({ timeout: 60000 });
      if (flow === 'email_sign_up') {
        // Simulate rejection before browser bot-protection runs; native signup
        // does not use the web Turnstile widget. This is isolated test state.
        await page.evaluate(() => {
          window.Clerk.client.signUp.create = async () => {
            window.__syntheticSignupRejected = true;
            throw { errors: [{ code: 'form_param_format_invalid', message: 'PRIVATE_SERVER_MESSAGE' }] };
          };
        });
      }
      if (flow.startsWith('email')) {
        await page.getByRole('textbox', { name: 'Email address', exact: true }).fill('synthetic@example.invalid');
        await page.getByLabel('Password', { exact: true }).fill('SYNTHETIC_PASSWORD');
      }
      await button.click();
      await expect(page.getByText(/Sign-in diagnostics v2/)).toBeVisible({ timeout: 15000 });
      const report = await page.getByText(/Sign-in diagnostics v2/).innerText();
      assert.match(report, new RegExp(`flow=${flow}`));
      assert.match(report, /category=form_param_format_invalid/);
      if (flow.startsWith('oauth')) assert.match(report, /phase=sign_in_create/);
      else assert.match(report, new RegExp(`phase=${flow === 'email_sign_in' ? 'password_submission' : 'account_creation'}`));
      assert.doesNotMatch(report, /PRIVATE_SERVER_MESSAGE|SYNTHETIC_PASSWORD|synthetic@example/);
      if (flow === 'email_sign_up') {
        assert.equal(await page.evaluate(() => window.__syntheticSignupRejected), true);
        assert.equal(intercepted, 0, 'synthetic signup must not reach the network');
      } else {
        assert.equal(intercepted, 1, 'submission must be intercepted, not sent to Clerk');
      }
      await page.getByRole('button', { name: 'Copy sign-in details' }).click();
      await expect(page.getByText('Details copied', { exact: true })).toBeVisible();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), report);
      await expect(button).toBeEnabled();
      console.log(`PASS ${flow}: safe details visible, copyable, and retry enabled`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
