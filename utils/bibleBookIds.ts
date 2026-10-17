import type { SQLiteDatabase } from 'expo-sqlite';

// The bundled edition's primary keys are not canonical Bible IDs (Acts and
// Romans are swapped). Keep storage identity out of passage routes/mappings.
export async function bibleStorageBookId(db: SQLiteDatabase, canonical: number) {
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM book WHERE book_reference_id=? AND id<=66', canonical,
  );
  if (!row) throw new Error('This canonical Bible book is missing from the installed edition.');
  return row.id;
}
