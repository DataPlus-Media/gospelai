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
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error('PAGE ERROR', error.message); });
  const text = value => page.getByText(value, { exact: true });
  const click = value => text(value).click();
  const go = async path => { await page.goto(base + path); await text('Opening Christian insight…').waitFor({ state: 'hidden' }); };
  const openMorning = () => page.getByRole('button', { name: /^Morning and Evening, by Charles Spurgeon/ }).click();
  const backDetails = () => page.getByRole('button', { name: 'Back to work details', exact: true }).click();
  try {
    await go('/library');
    await page.getByRole('button', { name: 'Exposition of the Old and New Testaments, by John Gill' }).click();
    await page.getByText('Rights blocker:', { exact: false }).waitFor();
    assert.equal(await text('Download for offline use').count(), 0);
    await go('/library');
    await openMorning();
    await text('EDITION / SOURCE').waitFor();
    await text('Download for offline use').waitFor();
    console.log('PASS guest library browsing, rights blocker, edition and source detail');

    let failOnce = true;
    const packagePattern = '**/library-packages/ccel-morn-eve-1/spurgeon-morning-evening.json';
    await context.route(packagePattern, async route => {
      if (failOnce) { failOnce = false; await route.abort('internetdisconnected'); }
      else await route.continue();
    });
    await click('Download for offline use');
    await text('Retry').waitFor();
    await click('Retry');
    await text('Read this work').waitFor({ timeout: 180000 });
    console.log('PASS failed download shows Retry; real edition downloads and installs');
    await click('Read this work');
    await text('HISTORICAL SOURCE TEXT').waitFor();
    await text('January 1 · Morning').waitFor();
    await page.getByRole('button', { name: 'Open table of contents', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search table of contents' }).fill('March 5');
    await click('March 5 · Evening');
    await click('Next');
    await text('March 6 · Morning').waitFor();
    await click('Previous');
    await text('March 5 · Evening').waitFor();
    await click('Save selected paragraph to Notes');
    await text('Paragraph saved to Notes on this device.').waitFor();
    await backDetails();
    await click('Resume reading');
    await text('March 5 · Evening').waitFor();
    await go('/library?work=spurgeon-morning-evening');
    await click('Resume reading');
    await text('March 5 · Evening').waitFor();
    console.log('PASS date navigation, next/previous, paragraph note and reload/resume');

    await go('/library');
    await click('Charles Spurgeon');
    await page.getByRole('button', { name: 'Limit search to Morning and Evening', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search downloaded library text' }).fill('Continue in prayer');
    await page.getByText('January 2 · Morning · paragraph', { exact: false }).first().waitFor();
    await page.getByText('January 2 · Morning · paragraph', { exact: false }).first().click();
    await text('January 2 · Morning').waitFor();
    await page.getByText('"Continue in prayer." --Colossians 4:2', { exact: true }).waitFor();
    console.log('PASS text search opens exact historical paragraph');

    await context.setOffline(true);
    await backDetails();
    await click('Resume reading');
    await text('January 2 · Morning').waitFor();
    await context.setOffline(false);
    console.log('PASS installed work reopens without network in the running app');

    await go('/library?work=henry-whole-bible');
    await click('Download for offline use');
    await text('Read this work').waitFor({ timeout: 240000 });
    await go('/bible?ref=John%203%3A16&jump=librarytest');
    await page.getByRole('button', { name: 'Open Christian insight for John 3', exact: true }).click();
    await page.getByRole('button', { name: 'Open John 3 in the original reading view', exact: true }).waitFor();
    await go('/bible?ref=John%203%3A16&jump=libraryverse');
    await page.getByRole('button', { name: 'John 3:16. Verse actions', exact: true }).click();
    await click('Christian insight · this verse');
    await page.getByText('Whole chapter', { exact: true }).first().waitFor();
    await page.getByRole('button', { name: 'Open John 3 in the original reading view', exact: true }).click();
    await text('John 3').filter({ visible: true }).waitFor();
    await page.getByRole('button', { name: 'Open table of contents', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search table of contents' }).fill('Romans 1');
    await click('Romans 1');
    await page.getByText('Completed by John Evans', { exact: false }).waitFor();
    console.log('PASS real full Henry download, visible Bible Christian insight button, verse link, chapter-level mapping and editorial attribution');

    await go('/library?work=spurgeon-morning-evening');
    await click('Remove download');
    await text('Remove this download?').waitFor();
    await click('Remove');
    await text('Download for offline use').waitFor();
    await go('/notes');
    await page.getByText('Charles Spurgeon · Morning and Evening · March 5 · Evening', { exact: false }).waitFor();
    await go('/library');
    await page.getByRole('button', { name: 'Commentary on the Whole Bible, by Matthew Henry, downloaded' }).waitFor();
    await go('/library?work=henry-whole-bible');
    await click('Remove download'); await click('Remove');
    await text('Download for offline use').waitFor();
    await go('/library?book=43&chapter=3&verse=16&jump=empty');
    await page.getByText('No downloaded commentary maps to this passage', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS removal confirmation, personal note retained, independent downloads, explicit commentary empty state, no browser errors');
  } catch (error) {
    await mkdir('generated-artifacts/library-browser', { recursive: true });
    await page.screenshot({ path: 'generated-artifacts/library-browser/failure.png' });
    console.error('FAILED at', page.url());
    console.error((await page.locator('body').innerText()).slice(-9000));
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
