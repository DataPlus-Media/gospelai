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
  const button = name => page.getByRole('button', { name, exact: true });
  try {
    await page.goto(`${base}/library?work=spurgeon-expositions&book=43&chapter=3&verse=18`);
    await page.getByText('EDITION / SOURCE', { exact: true }).waitFor();
    await page.getByText(/997 sections across 639 chapters in 59 books/).waitFor();
    await page.getByText('Download for offline use', { exact: true }).click();
    // A verse-linked download returns to that passage automatically.
    await page.getByText('John 3:18', { exact: true }).first().waitFor({ timeout: 120000 });
    const source = button('Read full source section: John 3:13–36');
    await source.waitFor({ timeout: 120000 });
    await source.scrollIntoViewIfNeeded();
    await source.waitFor();
    await context.setOffline(true);
    await source.click();
    // The verse screen expands the original section inline, without navigating
    // away from the selected scripture.
    await page.getByText(/He that believeth on him is not condemned/).first().waitFor();
    await mkdir('generated-artifacts/spurgeon-browser', { recursive: true });
    await page.screenshot({ path: 'generated-artifacts/spurgeon-browser/offline-reader.png' });
    assert.deepEqual(errors, []);
    console.log('PASS real Spurgeon download, John 3:18 range match and original section reading offline on a phone-size screen');
  } catch (error) {
    await mkdir('generated-artifacts/spurgeon-browser', { recursive: true });
    await page.screenshot({ path: 'generated-artifacts/spurgeon-browser/failure.png' });
    console.error('FAILED', page.url(), (await page.locator('body').innerText()).slice(-9000));
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
