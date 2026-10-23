const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const base = process.env.STUDY_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
const morningPackage = JSON.parse(require('node:fs').readFileSync('generated-artifacts/library/spurgeon-morning-evening.json', 'utf8'));
const morningManifest = require('../constants/libraryManifest.json')['spurgeon-morning-evening'];

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
  const go = async path => { await page.goto(base + path); await text('Opening Authors insight…').waitFor({ state: 'hidden' }); };
  const navigate = path => page.evaluate(path => {
    const entry = [...window.__r.getModules()].find(([, module]) =>
      module.verboseName?.endsWith('expo-router/build/imperative-api.js'));
    if (!entry) throw new Error('Metro router module unavailable in development test');
    window.__r(entry[0]).router.push(path);
  }, path);
  const henryOriginal = () => page.getByRole('button', {
    name: 'Open John 3 in the original reading view', exact: true, includeHidden: true,
  });
  try {
    await go('/library');
    await page.getByRole('button', { name: 'Exposition of the Old and New Testaments, by John Gill' }).click();
    await text('EDITION / SOURCE').waitFor();
    await page.getByText('SermonIndex MyBible module SI-GILL', { exact: false }).waitFor();
    await text('Download for offline use').waitFor();
    await click('Download for offline use');
    await text('Read this work').waitFor({ timeout: 240000 });
    await click('Read this work');
    await text('HISTORICAL SOURCE TEXT').waitFor();
    await text('Genesis 1 · Chapter introduction').waitFor();
    await go('/library?book=43&chapter=3&verse=18&jump=gill');
    await page.getByRole('button', { name: 'Read full source section: John 3:18', exact: true }).waitFor();
    await text('Verse 18').waitFor();
    await page.getByRole('button', { name: 'Read full source section: John 3:18', exact: true }).click();
    await page.getByText('He that believeth on him is not condemned', { exact: false }).first().waitFor();
    console.log('PASS complete Gill package downloads, opens offline reader and maps John 3:18 to its original verse section');

    await page.goto(base + '/today');
    await text('Opening your local study…').waitFor({ state: 'hidden' });
    await page.evaluate(async ({ source, manifest }) => {
      const entry = [...window.__r.getModules()].find(([, module]) =>
        module.verboseName?.endsWith('expo-sqlite/build/SQLiteDatabase.js'));
      const db = await window.__r(entry[0]).openDatabaseAsync('library.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS library_downloads (work_id TEXT PRIMARY KEY, revision TEXT NOT NULL, bytes INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS library_sections (
          work_id TEXT NOT NULL, id TEXT NOT NULL, ordinal INTEGER NOT NULL, title TEXT NOT NULL,
          source_url TEXT NOT NULL, attribution TEXT NOT NULL, book INTEGER, chapter INTEGER,
          verse_start INTEGER, verse_end INTEGER, PRIMARY KEY(work_id,id)
        );
        CREATE TABLE IF NOT EXISTS library_paragraphs (
          work_id TEXT NOT NULL, section_id TEXT NOT NULL, paragraph INTEGER NOT NULL,
          text TEXT NOT NULL, PRIMARY KEY(work_id,section_id,paragraph)
        );
        CREATE TABLE IF NOT EXISTS library_positions (work_id TEXT PRIMARY KEY, section_id TEXT NOT NULL, paragraph INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS library_notices (work_id TEXT PRIMARY KEY, notices TEXT NOT NULL);
      `);
      for (let offset = 0; offset < source.sections.length; offset += 30) {
        const sections = source.sections.slice(offset, offset + 30);
        const rows = sections.map((section, index) => [
          source.workId, section.id, offset + index, section.title, section.sourceUrl,
          section.attribution, null, null, null, null,
        ]);
        await db.runAsync(
          `INSERT INTO library_sections (work_id,id,ordinal,title,source_url,attribution,book,chapter,verse_start,verse_end) VALUES ${rows.map(row => `(${row.map(() => '?').join(',')})`).join(',')}`,
          ...rows.flat(),
        );
        const paragraphs = sections.flatMap(section => section.paragraphs.map((paragraph, index) =>
          [source.workId, section.id, index, paragraph]));
        for (let start = 0; start < paragraphs.length; start += 100) {
          const batch = paragraphs.slice(start, start + 100);
          await db.runAsync(
            `INSERT INTO library_paragraphs (work_id,section_id,paragraph,text) VALUES ${batch.map(row => `(${row.map(() => '?').join(',')})`).join(',')}`,
            ...batch.flat(),
          );
        }
      }
      await db.runAsync('INSERT INTO library_notices VALUES (?,?)', source.workId, JSON.stringify(source.notices));
      await db.runAsync('INSERT INTO library_downloads VALUES (?,?,?)', source.workId, source.revision, manifest.bytes);
      await db.runAsync('INSERT INTO library_positions VALUES (?,?,?)', source.workId, source.sections[0].id, 1);
      await db.closeAsync();
    }, { source: morningPackage, manifest: morningManifest });

    await go('/library');
    await click('Charles Spurgeon');
    const morningCard = page.getByRole('button', {
      name: 'Morning and Evening, by Charles Spurgeon, downloaded, unavailable', exact: true,
    });
    const treasuryCard = page.getByRole('button', {
      name: 'The Treasury of David, by Charles Spurgeon, unavailable', exact: true,
    });
    const graceCard = page.getByRole('button', {
      name: 'All of Grace, by Charles Spurgeon, unavailable', exact: true,
    });
    await morningCard.waitFor();
    for (const card of [morningCard, treasuryCard, graceCard]) {
      assert.equal(await card.isDisabled(), true, 'locked work cards are inert');
      assert.equal(await card.getAttribute('aria-disabled'), 'true', 'locked work is announced unavailable');
    }
    await morningCard.evaluate(element => element.click());
    assert.equal(new URL(page.url()).searchParams.get('work'), null, 'disabled card does not navigate');
    await page.getByRole('textbox', { name: 'Search downloaded library text' }).fill('Continue in prayer');
    await text('No matching passages').waitFor();
    assert.equal(await page.getByText('January 2 · Morning · paragraph', { exact: false }).count(), 0);
    await page.getByRole('textbox', { name: 'Search downloaded library text' }).fill('');

    await navigate('/library?work=spurgeon-morning-evening&section=01-02-am&paragraph=0');
    await page.getByRole('button', { name: /^Morning and Evening, by Charles Spurgeon/ }).waitFor();
    assert.equal(await text('HISTORICAL SOURCE TEXT').count(), 0, 'stale reader route is rejected even when work is installed');
    assert.equal(await page.getByText('"Continue in prayer." --Colossians 4:2', { exact: true }).count(), 0);
    const retained = await page.evaluate(async () => {
      const entry = [...window.__r.getModules()].find(([, module]) =>
        module.verboseName?.endsWith('expo-sqlite/build/SQLiteDatabase.js'));
      const db = await window.__r(entry[0]).openDatabaseAsync('library.db');
      const count = await db.getFirstAsync(`SELECT COUNT(*) AS count FROM library_sections WHERE work_id='spurgeon-morning-evening'`);
      const position = await db.getFirstAsync(`SELECT section_id,paragraph FROM library_positions WHERE work_id='spurgeon-morning-evening'`);
      const paragraph = await db.getFirstAsync(`SELECT text FROM library_paragraphs WHERE work_id='spurgeon-morning-evening' AND section_id='01-01-am' AND paragraph=0`);
      return { count: count.count, position, paragraph: paragraph.text };
    });
    assert.equal(retained.count, morningPackage.sections.length);
    assert.deepEqual(retained.position, { section_id: morningPackage.sections[0].id, paragraph: 1 });
    assert.ok(retained.paragraph.length > 0, 'downloaded text remains stored locally');
    console.log('PASS all three Spurgeon locks are visible and inert; installed Morning and Evening cannot open or appear in search, while local text, note, and position remain intact');

    await navigate('/library?work=spurgeon-treasury&section=psalm-1');
    await page.getByRole('button', { name: /^Commentary and Expositions, by Charles Spurgeon/ }).waitFor();
    assert.equal(await text('HISTORICAL SOURCE TEXT').count(), 0);
    await navigate('/library?work=spurgeon-all-grace&section=chapter-1');
    await page.getByRole('button', { name: /^Commentary and Expositions, by Charles Spurgeon/ }).waitFor();
    assert.equal(await text('HISTORICAL SOURCE TEXT').count(), 0);
    console.log('PASS stale detail and reader routes cannot enter Treasury of David or All of Grace');

    await navigate('/library?work=gill-exposition');
    await context.setOffline(true);
    await click('Resume reading');
    await text('Genesis 1 · Chapter introduction').waitFor();
    await text('HISTORICAL SOURCE TEXT').waitFor();
    await context.setOffline(false);
    console.log('PASS available author work remains readable offline');

    await navigate('/library?work=henry-whole-bible');
    await click('Download for offline use');
    await text('Read this work').waitFor({ timeout: 240000 });
    await go('/bible?ref=John%203%3A16&jump=librarytest');
    await page.getByRole('button', { name: 'Open Authors insight for John 3', exact: true }).click();
    await henryOriginal().scrollIntoViewIfNeeded();
    await henryOriginal().waitFor();
    await go('/bible?ref=John%203%3A16&jump=libraryverse');
    await page.getByRole('button', { name: 'Open actions for John 3:16', exact: true }).click();
    await click('Authors insight · this verse');
    await henryOriginal().scrollIntoViewIfNeeded();
    await page.getByText('Whole chapter', { exact: true }).first().waitFor();
    await henryOriginal().click();
    await text('John 3').filter({ visible: true }).waitFor();
    await page.getByRole('button', { name: 'Open table of contents', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search table of contents' }).fill('Romans 1');
    await click('Romans 1');
    await page.getByText('Completed by John Evans', { exact: false }).waitFor();
    console.log('PASS real full Henry download, visible Authors insight button, verse link, chapter-level mapping and editorial attribution');

    await go('/library');
    await page.getByRole('button', { name: 'Commentary on the Whole Bible, by Matthew Henry, downloaded' }).waitFor();
    await go('/library?work=gill-exposition');
    await click('Remove download');
    await text('Remove this download?').waitFor();
    await click('Remove');
    await text('Download for offline use').waitFor({ timeout: 120000 });
    await go('/library?work=henry-whole-bible');
    await click('Remove download'); await click('Remove');
    await text('Download for offline use').waitFor({ timeout: 120000 });
    await go('/library?book=43&chapter=3&verse=16&jump=empty');
    await page.getByText('Chapter commentary available · download required', { exact: true }).waitFor();
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
