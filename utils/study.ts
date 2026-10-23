import type { SQLiteDatabase } from 'expo-sqlite';

export type Position = { book: string; chapter: number; verse: number };
export type SavedVerse = Position & { text: string; kind: 'bookmark' | 'highlight' };
export const READING_PLAN = [
  { title: 'The Word and the light', reference: 'John 1:1-18' },
  { title: 'Loved by God', reference: 'John 3:1-21' },
  { title: 'The good shepherd', reference: 'Psalms 23:1-6' },
  { title: 'Learning to pray', reference: 'Matthew 6:5-15' },
  { title: 'Grace through faith', reference: 'Ephesians 2:1-10' },
  { title: 'A life of love', reference: '1 Corinthians 13:1-13' },
  { title: 'Peace and practice', reference: 'Philippians 4:4-9' },
];
export const referenceOf = (p: Position) => `${p.book} ${p.chapter}:${p.verse}`;
export const verseDraft = (reference: string, text: string) =>
  `Help me understand ${reference} (KJV):\n\n"${text}"\n\nWhat does this verse mean in context?`;

export async function getStudySummary(db: SQLiteDatabase) {
  const position = await db.getFirstAsync<Position>('SELECT book, chapter, verse FROM reading_position WHERE id = 1');
  const plan = await db.getFirstAsync<{ started: number }>('SELECT started FROM reading_plan WHERE id = 1');
  const completed = await db.getAllAsync<{ day: number }>('SELECT day FROM plan_completions ORDER BY day');
  return { position, plan: { started: !!plan?.started, completed: completed.map(r => r.day) } };
}
export async function savePosition(db: SQLiteDatabase, p: Position) {
  await db.runAsync('INSERT OR REPLACE INTO reading_position (id, book, chapter, verse) VALUES (1, ?, ?, ?)', p.book, p.chapter, p.verse);
}
export async function getSavedVerses(db: SQLiteDatabase) {
  return db.getAllAsync<SavedVerse>('SELECT * FROM saved_verses ORDER BY book, chapter, verse, kind');
}
export async function toggleSavedVerse(db: SQLiteDatabase, p: SavedVerse, remove: boolean) {
  if (remove) {
    await db.runAsync('DELETE FROM saved_verses WHERE book = ? AND chapter = ? AND verse = ? AND kind = ?', p.book, p.chapter, p.verse, p.kind);
  } else {
    await db.runAsync('INSERT OR REPLACE INTO saved_verses (book, chapter, verse, text, kind) VALUES (?, ?, ?, ?, ?)', p.book, p.chapter, p.verse, p.text, p.kind);
  }
}
export async function startPlan(db: SQLiteDatabase) {
  await db.runAsync('INSERT OR REPLACE INTO reading_plan (id, started) VALUES (1, 1)');
}
export async function completePlanDay(db: SQLiteDatabase, day: number) {
  if (!Number.isInteger(day) || day < 0 || day >= READING_PLAN.length) throw new Error('Invalid plan day');
  await db.withTransactionAsync(async () => {
    await startPlan(db);
    await db.runAsync('INSERT OR IGNORE INTO plan_completions (day) VALUES (?)', day);
  });
}
export async function resetPlan(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM plan_completions');
    await db.runAsync('DELETE FROM reading_plan');
  });
}
