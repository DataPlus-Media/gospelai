// Tests the real TypeScript helpers against SQLite, without a native emulator.
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const readline = require('node:readline');
function load(path, modules = {}) {
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports, require: name => modules[name] ?? (name.includes('Interfaces') ? { Role: { Bot: 1, User: 0 } } : require(name)),
  }, { filename: path });
  return exports;
}
const python = `
import sqlite3,json,sys
db=sqlite3.connect(sys.argv[1],isolation_level=None)
db.row_factory=sqlite3.Row
for line in sys.stdin:
 try:
  q=json.loads(line)
  if q['mode']=='exec':
   # sqlite3.executescript implicitly commits: execute statements individually.
   for statement in q['sql'].split(';'):
    if statement.strip(): db.execute(statement)
   result=None
  else:
   cur=db.execute(q['sql'],q.get('params',[]))
   if q['mode']=='all': result=[dict(r) for r in cur.fetchall()]
   elif q['mode']=='first':
    row=cur.fetchone(); result=dict(row) if row else None
   else: result={'lastInsertRowId':cur.lastrowid,'changes':cur.rowcount}
  print(json.dumps({'result':result}),flush=True)
 except Exception as e: print(json.dumps({'error':str(e)}),flush=True)
`;
function database(filename = ':memory:') {
  const process = spawn('python', ['-u', '-c', python, filename]);
  const pending = [];
  readline.createInterface({ input: process.stdout }).on('line', line => {
    const { resolve, reject } = pending.shift();
    const r = JSON.parse(line);
    r.error ? reject(new Error(r.error)) : resolve(r.result);
  });
  function call(mode, sql, params = []) {
    return new Promise((resolve, reject) => {
      pending.push({ resolve, reject });
      process.stdin.write(JSON.stringify({ mode, sql, params: Array.isArray(params[0]) ? params[0] : params }) + '\n');
    });
  }
  const db = {
    execAsync: sql => call('exec', sql),
    runAsync: (sql, ...params) => call('run', sql, params),
    getAllAsync: (sql, ...params) => call('all', sql, params),
    getFirstAsync: (sql, ...params) => call('first', sql, params),
    withTransactionAsync: async fn => {
      await call('exec', 'BEGIN');
      try { await fn(); await call('exec', 'COMMIT'); }
      catch (e) { await call('exec', 'ROLLBACK'); throw e; }
    },
    close: () => process.stdin.end(),
  };
  return db;
}
async function main() {
  const api = load('utils/Database.ts');
  const study = load('utils/study.ts');
  const nav = load('utils/navigation.ts');
  const books = load('constants/bibleBooks.ts');
  assert.equal(nav.entryRedirect(false, true), null);
  assert.equal(nav.entryRedirect(true, true), '/(auth)/(drawer)/today');
  assert.equal(nav.entryRedirect(true, true, 'login'), '/(auth)/(drawer)/today');
  assert.equal(nav.entryRedirect(true, true, 'index'), null);
  assert.equal(nav.entryRedirect(true, true, '(auth)'), null);
  assert.equal(nav.entryRedirect(true, false), null);
  assert.equal(nav.entryRedirect(true, false, '(auth)'), null);
  assert.equal(nav.entryRedirect(true, false, 'login'), null);
  assert.equal(nav.entryRedirect(true, false, 'unknown'), '/');
  console.log('PASS guest/signed-in entry routing and no app redirect loop');

  for (const version of [0, 1, 2]) {
    const db = database();
    try {
      if (version) {
        await db.execAsync(`CREATE TABLE chats (id INTEGER PRIMARY KEY, title TEXT NOT NULL);
          CREATE TABLE messages (id INTEGER PRIMARY KEY, chat_id INTEGER, content TEXT, imageUrl TEXT, role TEXT, prompt TEXT);
          INSERT INTO chats VALUES (5, 'Existing chat');
          INSERT INTO messages VALUES (7,5,'Existing message','','bot','');`);
        if (version === 2) {
          await db.execAsync(`CREATE TABLE notes (id INTEGER PRIMARY KEY, content TEXT, source TEXT, reference TEXT, created_at TEXT);
            INSERT INTO notes VALUES(9,'Existing note','chat','AI Response','2026-01-01');`);
        }
        await db.execAsync(`PRAGMA user_version = ${version}`);
      }
      await api.migrateDbIfNeeded(db);
      await api.migrateDbIfNeeded(db);
      assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 3);
      if (version) {
        assert.equal((await api.getChats(db))[0].title, 'Existing chat');
        assert.equal((await api.getMessages(db, 5))[0].content, 'Existing message');
      }
      if (version === 2) assert.equal((await api.getNotes(db))[0].content, 'Existing note');
      if (version === 0) {
        await db.execAsync("ATTACH DATABASE 'assets/bible/kjv.sqlite' AS kjv");
        for (const day of study.READING_PLAN) {
          const [, book, chapter, start, end] = /^(.*) (\d+):(\d+)-(\d+)$/.exec(day.reference);
          const verses = await db.getAllAsync('SELECT verse, text FROM kjv.verse WHERE book_id = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse',
            books.BOOK_NAME_TO_ID[book], Number(chapter), Number(start), Number(end));
          assert.equal(verses.length, Number(end) - Number(start) + 1);
          assert.ok(verses.every(v => v.text.length > 0));
        }
        console.log('PASS all seven plan ranges exist in bundled KJV scripture');
      }
      const p = { book: 'John', chapter: 3, verse: 16 };
      await study.savePosition(db, p);
      assert.equal(JSON.stringify((await study.getStudySummary(db)).position), JSON.stringify(p));
      const verse = { ...p, text: 'Actual KJV text', kind: 'bookmark' };
      await study.toggleSavedVerse(db, verse, false);
      await study.toggleSavedVerse(db, verse, false);
      await study.toggleSavedVerse(db, { ...verse, kind: 'highlight' }, false);
      assert.equal((await study.getSavedVerses(db)).length, 2);
      await study.toggleSavedVerse(db, verse, true);
      assert.equal((await study.getSavedVerses(db))[0].kind, 'highlight');
      await study.startPlan(db);
      for (let day = 0; day < 7; day++) await study.completePlanDay(db, day);
      await study.completePlanDay(db, 0);
      assert.equal((await study.getStudySummary(db)).plan.completed.length, 7);
      await assert.rejects(study.completePlanDay(db, 7));
      await study.resetPlan(db);
      const summary = await study.getStudySummary(db);
      assert.equal(summary.plan.started, false);
      assert.equal(summary.plan.completed.length, 0);
      assert.equal(summary.position.verse, 16);
      assert.equal((await study.getSavedVerses(db)).length, 1);
      if (version === 2) assert.equal((await api.getNotes(db))[0].content, 'Existing note');
      console.log(`PASS v${version} upgrade, preserve content, reading position, independent saved items/removal, all plan days and reset`);
    } finally { db.close(); }
  }
  assert.ok(study.verseDraft('John 3:16', 'Actual KJV text').includes('John 3:16 (KJV):\n\n"Actual KJV text"'));
  console.log('PASS verse draft uses supplied KJV text and reference');
}
module.exports = { load, database };
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
