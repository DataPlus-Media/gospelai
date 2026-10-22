const assert = require('node:assert/strict');
const { load, database } = require('./check-study.cjs');
const library = load('utils/library.ts', { '@/constants/bibleBooks': load('constants/bibleBooks.ts') });
const bible = database('assets/bible/kjv.sqlite');
const books = load('constants/bibleBooks.ts').BOOKS;
const bookIds = load('utils/bibleBookIds.ts');
const insight = load('utils/insight.ts', {
  '@/constants/bibleBooks': { BOOKS: books },
  '@/utils/bibleDb': { openBibleDb: async () => bible },
  '@/utils/bibleBookIds': bookIds,
});

async function main() {
  const db = database();
  try {
    const scripture = await insight.loadSelectedScripture(43, 3, 16);
    const john18 = await insight.loadSelectedScripture(43, 3, 18);
    assert.match(john18.text, /^He that believeth on him is not condemned/);
    assert.match((await insight.loadSelectedScripture(44, 17, 1)).text, /Amphipolis and Apollonia/);
    assert.match((await insight.loadSelectedScripture(45, 1, 1)).text, /^Paul, a servant of Jesus Christ/);
    assert.equal(await bookIds.bibleStorageBookId(bible, 44), 45);
    assert.equal(await bookIds.bibleStorageBookId(bible, 45), 44);
    assert.equal(scripture.reference, 'John 3:16');
    assert.equal(scripture.translation, 'King James Version (KJV)');
    assert.match(scripture.text, /^For God so loved the world/);
    assert.ok(!scripture.text.includes('17 '));
    const chapter = await insight.loadSelectedScripture(43, 3);
    assert.match(chapter.text, /^1 /);
    assert.match(chapter.text, /36 /);
    await assert.rejects(insight.loadSelectedScripture(43, 3, 999));
    await assert.rejects(insight.loadSelectedScripture(43, -1, 16));
    await assert.rejects(insight.loadSelectedScripture(43, 3, NaN));
    await assert.rejects(insight.loadSelectedScripture(99, 3, 16));
    assert.equal(insight.coverageLabel({ title: 'John 3', verse_start: null, verse_end: null }), 'Whole chapter');
    assert.equal(insight.coverageLabel({ title: 'John 3 · Chapter introduction', verse_start: null, verse_end: null }), 'Chapter introduction');
    assert.equal(insight.coverageLabel({ title: 'John 3:16', verse_start: 16, verse_end: 16 }), 'Verse 16');
    assert.equal(insight.coverageLabel({ title: 'John 3:14–21', verse_start: 14, verse_end: 21 }), 'Verses 14–21');
    console.log('PASS actual bundled KJV scripture, canonical reference, translation, chapter entry and invalid references');

    await library.initLibrary(db);
    await db.runAsync(`INSERT INTO library_downloads VALUES ('fixture','test',0)`);
    // Deliberately synthetic mappings used only in this isolated test DB.
    for (const [id, start, end] of [
      ['chapter', null, null], ['chapter-intro', null, null], ['range', 14, 21], ['verse', 16, 16],
    ]) {
      await db.runAsync(`INSERT INTO library_sections VALUES ('fixture',?,0,?,'https://example.test/source','Test only',43,3,?,?)`,
        id, id === 'chapter-intro' ? 'John 3 · Chapter introduction' : `TEST ONLY ${id}`, start, end);
      await db.runAsync(`INSERT INTO library_paragraphs VALUES ('fixture',?,0,'TEST ONLY original text')`, id);
    }
    const matchIds = async verse => (await library.commentaryForPassage(db, 43, 3, verse)).map(r => r.id).sort();
    assert.deepEqual(await matchIds(13), ['chapter', 'chapter-intro']);
    assert.deepEqual(await matchIds(14), ['chapter', 'chapter-intro', 'range']);
    assert.deepEqual(await matchIds(16), ['chapter', 'range', 'verse']);
    assert.deepEqual(await matchIds(21), ['chapter', 'chapter-intro', 'range']);
    assert.deepEqual(await matchIds(22), ['chapter', 'chapter-intro']);
    assert.deepEqual(await matchIds(undefined), ['chapter', 'chapter-intro', 'range', 'verse']);
    assert.equal((await library.commentaryForPassage(db, 43, 4, 16)).length, 0);
    const row = (await library.commentaryForPassage(db, 43, 3, 16))[0];
    const content = await library.readSection(db, row.work_id, row.id);
    const work = { author: 'Test author', title: 'Test work', edition: 'Test edition',
      attribution: 'Edition credit', rights: 'Test rights' };
    const draft = insight.sourceDraft(scripture, work, row, content);
    for (const expected of [scripture.text, scripture.reference, scripture.translation, work.author,
      work.title, work.edition, work.rights, work.attribution, content.source_url,
      content.attribution, content.paragraphs[0].text, 'not a narrower verse mapping', 'AI explanation']) {
      assert.ok(draft.includes(expected), expected);
    }
    await library.removeWork(db, 'fixture');
    assert.equal((await matchIds(16)).length, 0);
    await assert.rejects(library.readSection(db, 'fixture', 'range'), /not downloaded/);
    await db.runAsync(`INSERT INTO library_sections VALUES ('fixture','empty',0,'Empty','https://example.test','Test only',43,3,NULL,NULL)`);
    await assert.rejects(library.readSection(db, 'fixture', 'empty'), /no readable text/);
    console.log('PASS inclusive lower/upper boundaries, single verse, chapter mapping, missing sources, attributed editable source draft');
  } finally { db.close(); bible.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
