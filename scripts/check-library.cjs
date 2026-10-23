const assert = require('node:assert/strict');
const { readFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const { load, database } = require('./check-study.cjs');
const api = load('utils/library.ts', { '@/constants/bibleBooks': load('constants/bibleBooks.ts') });
const manifest = require('../constants/libraryManifest.json');
const source = id => JSON.parse(readFileSync(`generated-artifacts/library/${id}.json`, 'utf8'));
const work = id => ({ id, package: manifest[id] });
const catalog = load('constants/libraryWorks.ts', { './libraryManifest.json': { default: manifest } });
const download = load('utils/libraryDownload.ts', {
  'expo-constants': { __esModule: true, default: { expoConfig: {} } },
  'expo-crypto': { __esModule: true, default: {} },
  'react-native': { Platform: { OS: 'web' } },
  './library': { installWork: async () => {} },
});

async function main() {
  const dir = mkdtempSync(join(tmpdir(), 'gospel-library-'));
  let db = database(join(dir, 'library.sqlite'));
  try {
    await api.initLibrary(db);
    await api.initLibrary(db);
    assert.equal((await api.workAvailability(db, [work('henry-whole-bible')]))[0].state, 'download');
    for (const [id, m] of Object.entries(manifest)) {
      const bytes = readFileSync(`generated-artifacts/library/${id}.json`);
      assert.equal(bytes.length, m.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), m.sha256);
      api.validatePackage(source(id), work(id));
    }
    const henry = source('henry-whole-bible');
    const gill = source('gill-exposition');
    const morning = source('spurgeon-morning-evening');
    const morningWork = catalog.LIBRARY_WORKS.find(item => item.id === 'spurgeon-morning-evening');
    assert.equal(morningWork.appAccessBlocker, 'This work is currently unavailable for reading in the app.');
    assert.match(morningWork.rights, /Public Domain/);
    assert.equal(morningWork.blocker, undefined, 'the product lock is not a legal rights blocker');
    assert.equal(catalog.LIBRARY_WORKS.find(item => item.id === 'spurgeon-expositions').appAccessBlocker, undefined);
    assert.equal(henry.sections.filter(s => s.scripture).length, 1189);
    assert.equal(henry.sections.find(s => s.id === 'b45-c001').attribution.includes('John Evans'), true);
    assert.equal(henry.sections.find(s => s.id === 'b44-c001').attribution, 'Matthew Henry');
    assert.ok(henry.sections.find(s => s.id === 'preface-6').paragraphs.some(t => t.includes('Simon Browne')));
    assert.ok(morning.sections.some(s => s.id === '02-29-am'));
    assert.ok(morning.sections.some(s => s.id === '12-31-pm'));
    assert.equal(morning.sections.length, 732);
    assert.equal(gill.sections.length, 32139);
    assert.equal(gill.sections.filter(s => s.id.endsWith('-intro')).length, 1049);
    assert.equal(gill.sections.filter(s => s.scripture?.verseStart).length, 31090);
    assert.ok(gill.sections.some(s => s.id === 'b43-c003-v018' && s.title === 'John 3:18'));
    assert.ok(gill.sections.find(s => s.id === 'b43-c003-v018').attribution.includes('SermonIndex.net'));
    assert.ok(gill.notices.some(n => n.includes('12 KJV verses have no verse-specific source entry')));
    console.log('PASS verified package hashes, Henry chapter coverage and attribution, 32,139 Gill sections, 31,090 exact Gill verse mappings, and 732 devotional dates');

    await assert.rejects(api.installWork(db, { id: 'blocked', blocker: 'Rights unresolved' }, morning));
    await assert.rejects(api.installWork(db, {
      ...work('spurgeon-morning-evening'), appAccessBlocker: 'Product access lock.',
    }, morning));
    await assert.rejects(download.downloadWork(db, {
      ...work('spurgeon-morning-evening'), appAccessBlocker: 'Product access lock.',
    }, () => {}), /Product access lock/);
    await assert.rejects(api.installWork(db, work('spurgeon-morning-evening'), { ...morning, sections: morning.sections.slice(1) }));
    assert.equal((await api.installedWorks(db)).length, 0);
    let progress = 0;
    await api.installWork(db, work('spurgeon-morning-evening'), morning, f => { progress = f; });
    assert.equal(progress, 1);
    const all = await api.sectionsForWork(db, morning.workId);
    assert.equal(all.length, 732);
    const hits = await api.searchLibrary(db, 'Continue in prayer', [morning.workId]);
    assert.ok(hits.length > 0);
    assert.equal(hits[0].section_id, '01-02-am');
    const opened = await api.readSection(db, morning.workId, hits[0].section_id);
    assert.equal(opened.paragraphs[hits[0].paragraph].text, hits[0].text);
    assert.equal((await api.searchLibrary(db, '%', [morning.workId])).length, 0, 'LIKE wildcards must be literal');
    assert.equal((await api.searchLibrary(db, 'prayer', ['not-downloaded'])).length, 0);
    assert.equal((await api.searchLibrary(db, 'prayer', [])).length, 0);
    await api.saveLibraryPosition(db, morning.workId, hits[0].section_id, hits[0].paragraph);
    console.log('PASS import progress, rights-blocked/rejected editions, scoped literal search opens exact paragraph');

    // Persist to disk, close the process and reopen it without any network.
    db.close(); db = database(join(dir, 'library.sqlite'));
    await api.initLibrary(db);
    const position = await api.getLibraryPosition(db, morning.workId);
    assert.equal(position.section_id, hits[0].section_id);
    assert.equal(position.paragraph, hits[0].paragraph);
    assert.ok((await api.readSection(db, morning.workId, position.section_id)).paragraphs.length > 0);
    console.log('PASS process restart and offline read with saved exact reading position');

    // Simulate an import interruption in the middle of overwriting an installed edition.
    const realRun = db.runAsync;
    let inserts = 0;
    db.runAsync = async (...args) => {
      if (args[0].startsWith('INSERT INTO library_paragraphs') && ++inserts === 5) throw new Error('simulated disk failure');
      return realRun(...args);
    };
    await assert.rejects(api.installWork(db, work(morning.workId), morning), /simulated disk failure/);
    db.runAsync = realRun;
    assert.equal((await api.sectionsForWork(db, morning.workId)).length, 732);
    assert.equal((await api.installedWorks(db)).length, 1);
    await api.installWork(db, work(morning.workId), morning);
    assert.equal((await api.installedWorks(db)).length, 1);
    console.log('PASS interrupted import rolls back atomically; retry does not duplicate sections');

    await api.installWork(db, work(henry.workId), henry);
    assert.equal((await api.workAvailability(db, [work(henry.workId)]))[0].state, 'ready');
    const matches = await api.commentaryForPassage(db, 43, 3, 18);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, 'b43-c003');
    assert.equal(matches[0].verse_start, null);
    const books = load('constants/bibleBooks.ts').BOOKS;
    let checked = 0;
    const bibleDb = database('assets/bible/kjv.sqlite');
    try {
      const chapterEnds = await bibleDb.getAllAsync('SELECT b.book_reference_id AS book_id,v.chapter,MAX(v.verse) AS last FROM verse v JOIN book b ON b.id=v.book_id WHERE b.id<=66 GROUP BY b.book_reference_id,v.chapter');
      for (const book of books) {
        for (let chapter = 1; chapter <= book.chapters; chapter++) {
          const end = chapterEnds.find(row => row.book_id === book.id && row.chapter === chapter);
          assert.ok(end, `${book.name} ${chapter} exists in bundled Bible`);
          for (const verse of [1, end.last]) {
            const found = await api.commentaryForPassage(db, book.id, chapter, verse);
            assert.equal(found.length, 1, `${book.name} ${chapter}:${verse}`);
            assert.equal(found[0].id, `b${String(book.id).padStart(2, '0')}-c${String(chapter).padStart(3, '0')}`);
            assert.equal(found[0].verse_start, null);
            assert.equal(found[0].verse_end, null);
          }
          checked++;
        }
      }
      assert.equal(checked, 1189);
    } finally { bibleDb.close(); }
    console.log('PASS all 1189 canonical Henry chapter mappings at first/last Bible verses and John 3:18');

    await api.installWork(db, work(gill.workId), gill);
    assert.equal((await api.workAvailability(db, [work(gill.workId)]))[0].state, 'ready');
    const johnGill = (await api.commentaryForPassage(db, 43, 3, 18))
      .find(row => row.work_id === gill.workId);
    assert.equal(johnGill.id, 'b43-c003-v018');
    assert.equal(johnGill.verse_start, 18);
    assert.equal(johnGill.verse_end, 18);
    const johnGillSection = await api.readSection(db, gill.workId, johnGill.id);
    assert.equal(johnGillSection.paragraphs[0].text, gill.sections.find(s => s.id === johnGill.id).paragraphs[0]);
    const introFallback = (await api.commentaryForPassage(db, 13, 11, 1))
      .find(row => row.work_id === gill.workId);
    assert.equal(introFallback.id, 'b13-c011-intro');
    assert.equal(introFallback.verse_start, null);
    assert.ok((await api.commentaryForPassage(db, 43, 3)).some(row => row.id === 'b43-c003-v018'));
    await api.removeWork(db, gill.workId);
    assert.equal((await api.commentaryForPassage(db, 43, 3, 18)).some(row => row.work_id === gill.workId), false);
    console.log('PASS Gill installs offline, maps John 3:18 exactly, falls back to a labeled chapter introduction for a source gap, and removes cleanly');

    await api.saveLibraryPosition(db, henry.workId, 'b43-c003', 2);
    await db.runAsync(`DELETE FROM library_paragraphs WHERE work_id=? AND section_id='b43-c003'`, henry.workId);
    assert.equal((await api.workAvailability(db, [work(henry.workId)]))[0].state, 'incomplete');
    await api.installWork(db, work(henry.workId), henry);
    assert.equal((await api.getLibraryPosition(db, henry.workId)).paragraph, 2);
    assert.equal((await api.workAvailability(db, [work(henry.workId)]))[0].state, 'ready');
    await db.runAsync(`UPDATE library_sections SET book=NULL WHERE work_id=? AND id='b43-c003'`, henry.workId);
    assert.equal((await api.workAvailability(db, [work(henry.workId)]))[0].state, 'incomplete', 'lost chapter mapping is repairable, not no coverage');
    await db.runAsync(`UPDATE library_sections SET book=43 WHERE work_id=? AND id='b43-c003'`, henry.workId);
    await db.runAsync(`UPDATE library_downloads SET revision='damaged' WHERE work_id=?`, henry.workId);
    assert.equal((await api.workAvailability(db, [work(henry.workId)]))[0].state, 'incomplete');
    await db.runAsync(`DELETE FROM library_downloads WHERE work_id=?`, henry.workId);
    assert.equal((await api.workAvailability(db, [work(henry.workId)]))[0].state, 'incomplete', 'orphaned source rows need repair');
    await api.installWork(db, work(henry.workId), henry);
    assert.equal((await api.workAvailability(db, [{ ...work('blocked'), blocker: 'Rights unresolved' }]))[0].state, 'rights');
    const realGetAll = db.getAllAsync;
    db.getAllAsync = async () => { throw new Error('storage unavailable'); };
    await assert.rejects(api.workAvailability(db, [work(henry.workId)]), /storage unavailable/);
    db.getAllAsync = realGetAll;
    console.log('PASS missing text, mismatched markers, orphaned installs, storage failures and safe repair retaining position');
    db.close(); db = database(join(dir, 'library.sqlite'));
    assert.equal((await api.commentaryForPassage(db, 43, 3, 18))[0].id, 'b43-c003');
    assert.equal((await api.readSection(db, henry.workId, 'b43-c003')).paragraphs[0].text,
      henry.sections.find(s => s.id === 'b43-c003').paragraphs[0]);
    assert.equal((await api.workAvailability(db, [work(henry.workId)]))[0].state, 'ready');
    console.log('PASS Henry persists across database close/reopen and reads original John 3 offline');
    // Exercise precise verse-range semantics without altering the source package.
    await db.runAsync(`INSERT INTO library_sections VALUES ('henry-whole-bible','test-verse-range',9999,'Test mapping','','Test',43,3,16,18)`);
    assert.equal((await api.commentaryForPassage(db, 43, 3, 15)).length, 1);
    assert.equal((await api.commentaryForPassage(db, 43, 3, 16)).length, 2);
    assert.equal((await api.commentaryForPassage(db, 43, 3, 19)).length, 1);
    assert.equal((await api.commentaryForPassage(db, 43, 3)).length, 2, 'chapter link includes all matching verse ranges without assuming verse 1');
    assert.equal((await api.commentaryForPassage(db, 99, 1, 1)).length, 0);
    await api.removeWork(db, henry.workId);
    assert.equal((await api.commentaryForPassage(db, 43, 3, 16)).length, 0);
    assert.equal((await api.workNotices(db, morning.workId)).length, morning.notices.length);
    console.log('PASS full Henry import, chapter vs verse-range matching, missing-commentary state and independent work removal');

    // Personal notes are in the original app DB, not in the book-content DB.
    const appDb = database();
    try {
      const studyApi = load('utils/Database.ts');
      await studyApi.migrateDbIfNeeded(appDb);
      await studyApi.addNote(appDb, 'My personal reflection', 'library', 'Morning and Evening · January 2');
      await api.removeWork(db, morning.workId);
      assert.equal((await studyApi.getNotes(appDb))[0].content, 'My personal reflection');
      assert.ok(await api.getLibraryPosition(db, morning.workId));
      assert.equal((await api.installedWorks(db)).length, 0);
      assert.equal((await api.searchLibrary(db, 'prayer', [morning.workId])).length, 0);
      console.log('PASS removal retains personal notes and resume position, removes text/search/notices only');
    } finally { appDb.close(); }
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
