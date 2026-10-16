const assert = require('node:assert/strict');
const { readFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const { load, database } = require('./check-study.cjs');
const api = load('utils/library.ts');
const manifest = require('../constants/libraryManifest.json');
const source = id => JSON.parse(readFileSync(`generated-artifacts/library/${id}.json`, 'utf8'));
const work = id => ({ id, package: manifest[id] });

async function main() {
  const dir = mkdtempSync(join(tmpdir(), 'gospel-library-'));
  let db = database(join(dir, 'library.sqlite'));
  try {
    await api.initLibrary(db);
    await api.initLibrary(db);
    for (const [id, m] of Object.entries(manifest)) {
      const bytes = readFileSync(`generated-artifacts/library/${id}.json`);
      assert.equal(bytes.length, m.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), m.sha256);
      api.validatePackage(source(id), work(id));
    }
    const henry = source('henry-whole-bible'), morning = source('spurgeon-morning-evening');
    assert.equal(henry.sections.filter(s => s.scripture).length, 1189);
    assert.equal(henry.sections.find(s => s.id === 'b45-c001').attribution.includes('John Evans'), true);
    assert.equal(henry.sections.find(s => s.id === 'b44-c001').attribution, 'Matthew Henry');
    assert.ok(henry.sections.find(s => s.id === 'preface-6').paragraphs.some(t => t.includes('Simon Browne')));
    assert.ok(morning.sections.some(s => s.id === '02-29-am'));
    assert.ok(morning.sections.some(s => s.id === '12-31-pm'));
    assert.equal(morning.sections.length, 732);
    console.log('PASS verified package sizes/checksums, full Bible chapter coverage, Henry contributor attribution, 732 devotional dates');

    await assert.rejects(api.installWork(db, { id: 'blocked', blocker: 'Rights unresolved' }, morning));
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
    const matches = await api.commentaryForPassage(db, 43, 3, 16);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, 'b43-c003');
    assert.equal(matches[0].verse_start, null);
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
