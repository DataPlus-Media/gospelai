const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { load, database } = require('./check-study.cjs');
const books = load('constants/bibleBooks.ts');
const api = load('utils/library.ts', { '@/constants/bibleBooks': books });
const manifest = require('../constants/libraryManifest.json');
const id = 'spurgeon-expositions';
const work = { id, package: manifest[id] };

async function main() {
  const bytes = readFileSync(`generated-artifacts/library/${id}.json`);
  assert.equal(bytes.length, work.package.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), work.package.sha256);
  const source = JSON.parse(bytes);
  api.validatePackage(source, work);
  assert.equal(source.sections.length, 997);
  assert.equal(new Set(source.sections.map(s => s.id)).size, 997);
  assert.equal(new Set(source.sections.map(s => s.sourceUrl)).size, 639);
  assert.equal(new Set(source.sections.map(s => new URL(s.sourceUrl).pathname.split('/')[3])).size, 59);
  const unmapped = source.sections.filter(s => !s.scripture);
  assert.equal(unmapped.length, 1);
  assert.match(unmapped[0].title, /Revelation 20:11–15 and 21:1/);
  const bible = database('assets/bible/kjv.sqlite');
  try {
    const canonical = new Set((await bible.getAllAsync(`
      SELECT b.book_reference_id AS book,v.chapter,v.verse
      FROM verse v JOIN book b ON b.id=v.book_id WHERE b.id<=66
    `)).map(v => `${v.book}:${v.chapter}:${v.verse}`));
    for (const section of source.sections) {
      const m = section.scripture;
      if (!m?.verseStart) continue;
      for (let v = m.verseStart; v <= m.verseEnd; v++) {
        assert.ok(canonical.has(`${m.book}:${m.chapter}:${v}`), section.title);
      }
    }
  } finally { bible.close(); }
  const db = database(':memory:');
  try {
    await api.initLibrary(db);
    await api.installWork(db, work, source);
    assert.equal((await api.workAvailability(db, [work]))[0].state, 'ready');
    const matches = await api.commentaryForPassage(db, 43, 3, 18);
    assert.equal(matches.length, 2);
    assert.ok(matches.every(m => m.verse_start <= 18 && m.verse_end >= 18));
    const range = matches.find(m => m.verse_start === 13 && m.verse_end === 36);
    assert.ok(range);
    assert.ok(!(await api.commentaryForPassage(db, 43, 3, 12)).some(m => m.id === range.id));
    assert.ok((await api.commentaryForPassage(db, 43, 3, 13)).some(m => m.id === range.id));
    assert.ok((await api.commentaryForPassage(db, 43, 3, 36)).some(m => m.id === range.id));
    assert.ok((await api.commentaryForPassage(db, 19, 23, 1)).length > 0);
    assert.equal((await api.commentaryForPassage(db, 15, 1, 1)).length, 0);
    assert.equal((await api.commentaryForPassage(db, 63, 1, 1)).length, 0);
    assert.ok(!(await api.commentaryForPassage(db, 66, 20, 11)).some(m => m.id === unmapped[0].id));
    assert.ok((await api.readSection(db, id, unmapped[0].id)).paragraphs.length);
    const text = await api.readSection(db, id, range.id);
    assert.match(text.paragraphs.map(p => p.text).join(' '), /He that believeth on him is not condemned/);
    await api.saveLibraryPosition(db, id, range.id, 0);
    await api.removeWork(db, id);
    assert.equal((await api.workAvailability(db, [work]))[0].state, 'download');
    assert.equal((await api.getLibraryPosition(db, id)).section_id, range.id);
    assert.equal((await api.commentaryForPassage(db, 43, 3, 18)).length, 0);
  } finally { db.close(); }
  console.log('PASS Spurgeon integrity, 59-book/639-chapter coverage, canonical ranges, John 3:18, Psalms, honest gaps, offline read and safe removal');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
