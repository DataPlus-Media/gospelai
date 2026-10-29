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
    for (const testCase of [
      { flow: 'email_sign_in', register: false },
      { flow: 'email_sign_up', register: true },
      { flow: 'oauth_google', register: false },
      { flow: 'oauth_apple', register: false },
      { flow: 'oauth_google', register: true },
      { flow: 'oauth_apple', register: true },
    ]) {
      const { flow, register } = testCase;
      const context = await browser.newContext({
        viewport: { width: 402, height: 874 },
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
      await page.goto(`${base}/login?type=${register ? 'register' : 'login'}`);
      const buttonName = flow === 'email_sign_in' ? 'Sign in'
        : flow === 'email_sign_up' ? 'Create account'
        : flow === 'oauth_google' ? 'Continue with Google' : 'Continue with Apple';
      const button = page.getByRole('button', { name: buttonName, exact: true });
      await expect(button).toBeEnabled({ timeout: 60000 });
      if (register) {
        // Simulate rejection before browser bot-protection runs; native signup
        // does not use the web Turnstile widget. This is isolated test state.
        await page.evaluate(() => {
          window.Clerk.client.signUp.create = async (params) => {
            window.__syntheticSignupRejected = true;
            window.__syntheticSignupParams = params;
            throw { errors: [{ code: 'form_param_format_invalid', message: 'PRIVATE_SERVER_MESSAGE' }] };
          };
        });
      }
      if (flow.startsWith('email')) {
        if (flow === 'email_sign_up') {
          await page.getByRole('textbox', { name: 'First name', exact: true }).fill('Synthetic');
        }
        await page.getByRole('textbox', { name: 'Email address', exact: true }).fill('synthetic@example.invalid');
        await page.getByLabel('Password', { exact: true }).fill('SYNTHETIC_PASSWORD');
      }
      await button.click();
      const userError = page.getByRole('alert');
      await expect(userError).toBeVisible({ timeout: 15000 });
      const renderedError = await userError.innerText();
      assert.match(renderedError, /Couldn’t sign in|Couldn’t create account|Provider sign-in could not finish/);
      assert.doesNotMatch(renderedError, /PRIVATE_SERVER_MESSAGE|SYNTHETIC_PASSWORD|synthetic@example/);
      await expect(page.getByText(/Sign-in diagnostics v2|flow=email_|intent=sign_|platform=|service=|category=|error_type=|http=/i)).toHaveCount(0);
      if (register) {
        assert.equal(await page.evaluate(() => window.__syntheticSignupRejected), true);
        const params = await page.evaluate(() => window.__syntheticSignupParams);
        if (flow === 'email_sign_up') {
          assert.equal(params.firstName, 'Synthetic', 'email registration must persist the entered name');
        } else {
          assert.equal(params.strategy, flow, 'provider registration must use the signup resource');
        }
        assert.equal(intercepted, 0, 'synthetic signup must not reach the network');
      } else {
        assert.equal(intercepted, 1, 'submission must be intercepted, not sent to Clerk');
      }
      await expect(button).toBeEnabled();
      console.log(`PASS ${flow} (${register ? 'register' : 'login'}): friendly error shown, technical diagnostics hidden, retry enabled`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
