// All synthetic mappings below exist only in an isolated browser test context.
// They exercise comparison boundary cases beyond the shipped source mappings.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const base = process.env.STUDY_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
    headless: true, args: ['--no-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const text = value => page.getByText(value, { exact: true });
  const button = name => page.getByRole('button', { name, exact: true });
  const go = async path => { await page.goto(base + path); await text('King James Version (KJV)').waitFor(); };
  // Use the already-loaded app's real router so offline checks do not require a web reload.
  const navigate = path => page.evaluate(path => {
    const entry = [...window.__r.getModules()].find(([, m]) =>
      m.verboseName?.endsWith('expo-router/build/imperative-api.js'));
    if (!entry) throw new Error('Metro router module unavailable in development test');
    window.__r(entry[0]).router.push(path);
  }, path);
  try {
    await page.goto(base + '/bible?ref=John%203%3A18&jump=fresh-insight');
    await button('Open actions for John 3:18').click();
    await text('Authors insight · this verse').click();
    await text('John 3:18').waitFor();
    await text('Chapter commentary available · download required').waitFor();
    await mkdir('generated-artifacts/insight-browser', { recursive: true });
    await page.screenshot({ path: 'generated-artifacts/insight-browser/verse-narrow.png' });
    await text('Full work · 37.7 MB').waitFor();
    assert.equal(await text('0 matches').count(), 0);
    assert.equal(await page.locator('body').evaluate(el => el.scrollWidth > window.innerWidth), false);
    assert.equal(await text('Rights blocked').count(), 1);
    await button('Ask AI about selected scripture').click();
    const scriptureDraft = page.getByRole('textbox', { name: 'Write a message', exact: true });
    await scriptureDraft.waitFor();
    assert.match(await scriptureDraft.inputValue(), /SCRIPTURE · John 3:18 · King James Version/);
    assert.match(await scriptureDraft.inputValue(), /Help me understand John 3:18/);
    assert.equal(await page.getByText('Source draft:', { exact: false }).count(), 0);
    await navigate('/library?book=43&chapter=3&verse=18&jump=fresh-insight');
    await button('Compare sources').click();
    await page.getByText('Only 0 downloaded commentary', { exact: false }).waitFor();
    let failOnce = true;
    await context.route('**/library-packages/ccel-mhc2-1/henry-whole-bible.json', async route => {
      if (failOnce) { failOnce = false; await route.abort('internetdisconnected'); }
      else await route.continue();
    });
    await button('Download commentary for Commentary on the Whole Bible').click();
    assert.ok(page.url().includes('verse=18'), 'details preserve selected verse');
    await text('Download for offline use').click();
    await text('Retry').waitFor();
    await text('Retry').click();
    await button('Read full source section: John 3').waitFor({ timeout: 240000 });
    await text('John 3:18').waitFor();
    assert.ok(!page.url().includes('work='), 'successful install returns automatically');
    await button('Open John 3 in the original reading view').click();
    await button('Back to work details').click();
    await button('Return to selected passage').click();
    await text('John 3:18').waitFor();
    await text('Whole chapter').waitFor();
    await page.evaluate(() => {
      const entry = [...window.__r.getModules()].find(([, m]) =>
        m.verboseName?.endsWith('expo-sqlite/build/SQLiteDatabase.js'));
      const proto = window.__r(entry[0]).SQLiteDatabase.prototype;
      const original = proto.getAllAsync;
      proto.getAllAsync = function(sql, ...args) {
        if (sql.includes('SUM(CASE')) {
          proto.getAllAsync = original;
          return Promise.reject(new Error('TEST ONLY storage read failed'));
        }
        return original.call(this, sql, ...args);
      };
    });
    await navigate('/library?book=43&chapter=3&verse=18&jump=storage-error');
    await text('TEST ONLY storage read failed').waitFor();
    assert.equal(await text('0 matches').count(), 0);
    assert.equal(await text('No verified mapping').count(), 0);
    await button('Retry loading sources').click();
    await text('Whole chapter').waitFor();
    await navigate('/library?book=43&chapter=3&verse=16&jump=real');
    await button('Read full source section: John 3').waitFor();
    await text('Whole chapter').waitFor();
    await text('EXCERPT · DOWNLOADED SOURCE TEXT').waitFor();
    await button('Compare sources').click();
    await page.getByText('Only 1 downloaded commentary', { exact: false }).waitFor();
    await button('Author Insights').click();
    await button('Read full source section: John 3').click();
    await text('CONTRIBUTOR / ATTRIBUTION').waitFor();
    await text('DOWNLOADED EDITION NOTICES').waitFor();
    await page.getByRole('link', { name: 'Open source edition' }).waitFor();
    await page.getByRole('link', { name: 'Open rights statement' }).waitFor();
    console.log('PASS guest verse header, actual KJV, distinct unavailable states, real download, honest single source and provenance');

    let sends = 0;
    await context.route('**/api/chat', async route => {
      sends++;
      const body = route.request().postDataJSON();
      assert.match(body.message, /SCRIPTURE · John 3:16 · King James Version/);
      assert.match(body.message, /ORIGINAL SOURCE TEXT/);
      assert.match(body.message, /Matthew Henry/);
      assert.match(body.message, /my edited question/);
      await route.fulfill({ json: { reply: 'Test-only AI response, not a source quotation.' } });
    });
    await button('Ask GospelAI about this source').click();
    await text('Review draft').waitFor();
    await text('Cancel').click();
    assert.equal(sends, 0);
    await button('Ask GospelAI about this source').click();
    await button('Review draft').click();
    const draft = page.getByRole('textbox', { name: 'Write a message', exact: true });
    await draft.waitFor();
    const original = await draft.inputValue();
    assert.match(original, /For God so loved the world/);
    assert.match(original, /Whole chapter/);
    assert.match(original, /https:\/\/www.ccel.org\/h\/henry\/mhc2\/MHC43003.HTM/);
    assert.match(original, /not a narrower verse mapping/);
    assert.match(original, /not.*source-verified/);
    await page.getByText('Sending shares its Scripture and source text', { exact: false }).waitFor();
    assert.equal(sends, 0);
    await draft.fill(original + '\nmy edited question');
    await button('Send message').click();
    await text('Test-only AI response, not a source quotation.').waitFor();
    assert.equal(sends, 1);
    console.log('PASS cancellable disclosure, editable attributed draft, no automatic submission, explicit send to stubbed AI');

    await navigate('/library?book=43&chapter=3&verse=16&jump=fixtures');
    await button('Read full source section: John 3').waitFor();
    await page.evaluate(async () => {
      const entry = [...window.__r.getModules()].find(([, m]) =>
        m.verboseName?.endsWith('expo-sqlite/build/SQLiteDatabase.js'));
      const db = await window.__r(entry[0]).openDatabaseAsync('library.db');
      const original = await db.getFirstAsync(`SELECT * FROM library_sections WHERE work_id='henry-whole-bible' AND id='b43-c003'`);
      const paragraph = await db.getFirstAsync(`SELECT text FROM library_paragraphs WHERE work_id='henry-whole-bible' AND section_id='b43-c003' AND paragraph=2`);
      // Keep the verified section count while replacing two unmapped introductions
      // with test-only mappings. No real source package is changed.
      await db.runAsync(`DELETE FROM library_sections WHERE work_id='henry-whole-bible' AND id IN ('b01-c000','b02-c000')`);
      for (const [id, start, end] of [['test-range', 14, 21], ['test-single', 16, 16]]) {
        await db.runAsync(`INSERT INTO library_sections VALUES ('henry-whole-bible',?,9999,?,?,?,43,3,?,?)`,
          id, `TEST ONLY ${id}`, original.source_url, original.attribution, start, end);
        await db.runAsync(`INSERT INTO library_paragraphs VALUES ('henry-whole-bible',?,0,?)`, id, paragraph.text);
      }
      // A mapped devotional is still not commentary, even if future packages add mappings.
      await db.runAsync(`INSERT INTO library_downloads VALUES ('spurgeon-morning-evening','test-only',0)`);
      await db.runAsync(`INSERT INTO library_sections VALUES ('spurgeon-morning-evening','test-devotional',0,'TEST ONLY devotional','https://example.test','Test only',43,3,16,16)`);
    });
    await navigate('/library?book=43&chapter=3&verse=16&jump=multi');
    await text('3 matches').waitFor();
    assert.equal(await text('TEST ONLY devotional').count(), 0);
    await button('Add John 3 to comparison').click();
    await button('Add TEST ONLY test-range to comparison').click();
    await text('2/2').waitFor();
    assert.equal(await button('Add TEST ONLY test-single to comparison').isDisabled(), true);
    const first = page.getByLabel('Comparison source 1', { exact: true });
    const second = page.getByLabel('Comparison source 2', { exact: true });
    await first.getByText('DOWNLOADED EDITION NOTICES', { exact: true }).waitFor();
    await second.getByText('Verses 14–21', { exact: true }).waitFor();
    assert.ok((await first.innerText()).includes('Matthew Henry'));
    assert.ok((await second.innerText()).includes('Commentary on the Whole Bible'));
    const narrowA = await first.boundingBox(), narrowB = await second.boundingBox();
    assert.ok(narrowB.y >= narrowA.y + narrowA.height - 2, 'narrow panels stack');
    await page.setViewportSize({ width: 1200, height: 900 });
    const wideA = await first.boundingBox(), wideB = await second.boundingBox();
    assert.ok(Math.abs(wideA.y - wideB.y) < 2 && wideB.x > wideA.x, 'wide panels sit side by side');
    await first.getByRole('button', { name: 'Remove John 3 from comparison', exact: true }).click();
    await button('Add TEST ONLY test-single to comparison').click();
    await text('2/2').waitFor();
    await button('Clear comparison').click();
    await text('0/2').waitFor();
    console.log('PASS commentary-only selection, max two, replace/remove/clear, range and verse labels, narrow/wide panels with attribution');

    await button('Add TEST ONLY test-range to comparison').click();
    await context.setOffline(true);
    await button('Add John 3 to comparison').click();
    await first.getByText('DOWNLOADED EDITION NOTICES', { exact: true }).waitFor();
    await second.getByText('DOWNLOADED EDITION NOTICES', { exact: true }).waitFor();
    await navigate('/library?book=43&chapter=3&verse=22&jump=changed');
    await text('John 3:22').waitFor();
    await text('1 match').waitFor();
    assert.equal(await text('TEST ONLY test-range').count(), 0);
    assert.equal(await text('TEST ONLY test-single').count(), 0);
    await button('Compare sources').click();
    await text('0/2').waitFor();
    await button('Author Insights').click();
    await button('Read full source section: John 3').click();
    await text('DOWNLOADED EDITION NOTICES').waitFor();
    await navigate('/library?book=45&chapter=1&verse=1&jump=contributor');
    await button('Read full source section: Romans 1').click();
    await page.getByText('Completed by John Evans', { exact: false }).waitFor();
    assert.match(await page.getByTestId('selected-scripture-text').innerText(), /^Paul, a servant of Jesus Christ/);
    assert.ok(!(await page.getByTestId('selected-scripture-text').innerText()).includes('For God so loved the world'));
    console.log('PASS source comparison offline in loaded app, verse switch resets selections/results, contributor attribution');
    await context.setOffline(false);
    await navigate('/bible?ref=Acts%2017%3A1&jump=canonical-acts');
    await button('Open actions for Acts 17:1').click();
    await text('Authors insight · this verse').click();
    await button('Read full source section: Acts 17').waitFor();
    assert.match(await page.getByTestId('selected-scripture-text').innerText(), /Amphipolis and Apollonia/);
    await navigate('/library?book=43&chapter=4&jump=chapter');
    await text('John 4').first().waitFor();
    await text('King James Version (KJV)').waitFor();
    await text('Whole chapter').waitFor();
    await navigate('/library?work=henry-whole-bible&book=43&chapter=3&verse=18&jump=remove');
    await text('Remove download').click();
    await text('Remove').click();
    await text('Download for offline use').waitFor();
    await button('Return to selected passage').click();
    await text('Chapter commentary available · download required').waitFor();
    await button('Download commentary for Commentary on the Whole Bible').click();
    await text('Download for offline use').click();
    await button('Read full source section: John 3').waitFor({ timeout: 240000 });
    await text('John 3:18').waitFor();

    // Simulate damaged local text; it must be repairable, not called unmapped.
    await page.evaluate(async () => {
      const entry = [...window.__r.getModules()].find(([, m]) =>
        m.verboseName?.endsWith('expo-sqlite/build/SQLiteDatabase.js'));
      const db = await window.__r(entry[0]).openDatabaseAsync('library.db');
      await db.runAsync(`DELETE FROM library_paragraphs WHERE work_id='henry-whole-bible' AND section_id='b43-c003'`);
      await db.runAsync(`INSERT OR REPLACE INTO library_positions VALUES ('henry-whole-bible','b43-c003',2)`);
    });
    await navigate('/library?book=43&chapter=3&verse=18&jump=damaged');
    await text('Incomplete download').waitFor();
    assert.equal(await text('No verified mapping').count(), 0);
    await button('Repair download for Commentary on the Whole Bible').click();
    await text('Repair download').click();
    await button('Read full source section: John 3').waitFor({ timeout: 240000 });
    await text('John 3:18').waitFor();
    await context.setOffline(true);
    await navigate('/library?book=43&chapter=4&verse=1&jump=offline-reopen');
    await button('Read full source section: John 4').click();
    await text('DOWNLOADED EDITION NOTICES').waitFor();
    await context.setOffline(false);
    console.log('PASS John 3:18 download failure/retry, automatic return, detail return, removal/reinstall, incomplete repair and offline reopening');
    assert.deepEqual(errors, []);
  } catch (error) {
    await mkdir('generated-artifacts/insight-browser', { recursive: true });
    await page.screenshot({ path: 'generated-artifacts/insight-browser/failure.png' });
    console.error('FAILED', page.url().slice(0, 200));
    console.error((await page.locator('body').innerText()).slice(-7000));
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
