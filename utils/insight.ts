import { BOOKS } from '@/constants/bibleBooks';
import { openBibleDb } from '@/utils/bibleDb';
import { bibleStorageBookId } from '@/utils/bibleBookIds';
import type { LibraryWork, PassageMatch } from './libraryTypes';

export type SelectedScripture = { reference: string; text: string; translation: string };
export type SourceContent = {
  title: string; source_url: string; attribution: string;
  paragraphs: { paragraph: number; text: string }[];
};

export function coverageLabel(row: Pick<PassageMatch, 'verse_start' | 'verse_end'>) {
  if (row.verse_start === null) return 'Whole chapter';
  return row.verse_start === row.verse_end
    ? `Verse ${row.verse_start}` : `Verses ${row.verse_start}–${row.verse_end}`;
}

export async function loadSelectedScripture(book: number, chapter: number, verse?: number): Promise<SelectedScripture> {
  const meta = BOOKS.find(item => item.id === book);
  if (!meta || !Number.isInteger(chapter) || chapter < 1 || chapter > meta.chapters ||
    (verse !== undefined && (!Number.isInteger(verse) || verse < 1))) {
    throw new Error('This scripture reference is not valid. Select a passage in the Bible and try again.');
  }
  const db = await openBibleDb();
  const storageBook = await bibleStorageBookId(db, book);
  const params = verse === undefined ? [storageBook, chapter] : [storageBook, chapter, verse];
  const where = `book_id = ? AND chapter = ?${verse === undefined ? '' : ' AND verse = ?'} ORDER BY verse`;
  let rows: { verse: number; text: string }[];
  try {
    rows = await db.getAllAsync(`SELECT verse,text FROM verse WHERE ${where}`, params);
  } catch {
    rows = await db.getAllAsync(`SELECT verse,text FROM verses WHERE ${where}`, params);
  }
  if (!rows.length) throw new Error('Bible text could not be found for this reference. Return to the Bible to select it again.');
  return {
    reference: `${meta.name} ${chapter}${verse === undefined ? '' : `:${verse}`}`,
    text: rows.map(row => verse === undefined ? `${row.verse} ${row.text}` : row.text).join('\n\n'),
    translation: 'King James Version (KJV)',
  };
}

export function sourceDraft(scripture: SelectedScripture, work: LibraryWork, row: PassageMatch, content: SourceContent) {
  return [
    `Help me study ${scripture.reference}. Please distinguish your AI explanation from the original source; do not present generated wording as an author quotation or a source-verified answer.`,
    `SCRIPTURE · ${scripture.reference} · ${scripture.translation}\n${scripture.text}`,
    `HISTORICAL SOURCE · ${work.author} · ${work.title}\nSection: ${content.title}\nCoverage: ${coverageLabel(row)} (not a narrower verse mapping)\nPassage attribution: ${content.attribution}\nEdition: ${work.edition}\nSource: ${content.source_url}\nRights: ${work.rights}\nEdition attribution: ${work.attribution}`,
    `ORIGINAL SOURCE TEXT\n${content.paragraphs.map(p => p.text).join('\n\n')}`,
    'MY QUESTION (edit before sending):\nHelp me understand this source in relation to the selected scripture.',
  ].join('\n\n');
}
