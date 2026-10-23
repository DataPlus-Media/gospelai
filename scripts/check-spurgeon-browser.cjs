const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const base = process.env.STUDY_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
    headless: true, args: ['--no-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 402, height: 874 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(`${base}/library?work=spurgeon-expositions&book=43&chapter=3&verse=18`);
    await page.getByText('EDITION / SOURCE', { exact: true }).waitFor();
    await page.getByText(/997 sections across 639 chapters in 59 books/).waitFor();
    await page.getByText('Download for offline use', { exact: true }).click();
    await page.getByText('READ THE RECORD', { exact: true }).waitFor({ timeout: 120000 });
    // Confirm the available Spurgeon work can still be resumed and read without
    // relying on the separate selected-passage scripture view.
    await page.goto(`${base}/library?work=spurgeon-expositions`);
    await page.getByText('Read this work', { exact: true }).waitFor({ timeout: 30000 });
    await context.setOffline(true);
    await page.getByText('Read this work', { exact: true }).click();
    await page.getByText('HISTORICAL SOURCE TEXT', { exact: true }).waitFor();
    await page.getByText('Genesis 1:1–31', { exact: true }).waitFor();
    await page.getByText('In the beginning God created the heaven and the earth.', { exact: false }).first().waitFor();
    await mkdir('generated-artifacts/spurgeon-browser', { recursive: true });
    await page.screenshot({ path: 'generated-artifacts/spurgeon-browser/offline-reader.png' });
    assert.deepEqual(errors, []);
    console.log('PASS available Spurgeon Expositions downloads, resumes and opens original text offline on a phone-size screen');
  } catch (error) {
    await mkdir('generated-artifacts/spurgeon-browser', { recursive: true });
    await page.screenshot({ path: 'generated-artifacts/spurgeon-browser/failure.png' });
    console.error('FAILED', page.url(), (await page.locator('body').innerText()).slice(-9000));
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
