import type { SQLiteDatabase } from 'expo-sqlite';
import { BOOKS } from '@/constants/bibleBooks';
import type {
  InstalledWork, LibraryHit, LibraryPackage, LibraryWork,
  ReadingPosition, SectionSummary, PassageMatch,
} from './libraryTypes';

// Kept separate from personal notes, chats and Bible progress. Work removal
// deliberately retains reading positions and every personal note.
export async function initLibrary(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS library_downloads (
      work_id TEXT PRIMARY KEY, revision TEXT NOT NULL, bytes INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS library_sections (
      work_id TEXT NOT NULL, id TEXT NOT NULL, ordinal INTEGER NOT NULL,
      title TEXT NOT NULL, source_url TEXT NOT NULL, attribution TEXT NOT NULL,
      book INTEGER, chapter INTEGER, verse_start INTEGER, verse_end INTEGER,
      PRIMARY KEY(work_id,id)
    );
    CREATE INDEX IF NOT EXISTS library_scripture ON library_sections(book,chapter);
    CREATE TABLE IF NOT EXISTS library_paragraphs (
      work_id TEXT NOT NULL, section_id TEXT NOT NULL, paragraph INTEGER NOT NULL,
      text TEXT NOT NULL, PRIMARY KEY(work_id,section_id,paragraph)
    );
    CREATE TABLE IF NOT EXISTS library_positions (
      work_id TEXT PRIMARY KEY, section_id TEXT NOT NULL, paragraph INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS library_notices (
      work_id TEXT PRIMARY KEY, notices TEXT NOT NULL
    );
  `);
}

export function validatePackage(value: unknown, work: LibraryWork): LibraryPackage {
  const p = value as LibraryPackage;
  if (!work.package || work.blocker || work.appAccessBlocker || !p || p.schema !== 1 || p.workId !== work.id ||
    p.revision !== work.package.revision || !Array.isArray(p.notices) ||
    !p.notices.length || !p.notices.every(n => typeof n === 'string') ||
    !Array.isArray(p.sections) || p.sections.length !== work.package.sections) {
    throw new Error('This download does not match the verified edition. Please retry.');
  }
  const ids = new Set<string>();
  for (const section of p.sections) {
    const m = section.scripture;
    if (!section || typeof section.id !== 'string' || !section.id || ids.has(section.id) ||
      typeof section.title !== 'string' || !section.title ||
      typeof section.attribution !== 'string' || !section.attribution ||
      typeof section.sourceUrl !== 'string' || !section.sourceUrl.startsWith('https://') ||
      !Array.isArray(section.paragraphs) || !section.paragraphs.length ||
      !section.paragraphs.every(t => typeof t === 'string' && t.trim().length > 0) ||
      (m && (!Number.isInteger(m.book) || m.book < 1 || m.book > 66 ||
        !Number.isInteger(m.chapter) || m.chapter < 1 ||
        ((m.verseStart === undefined) !== (m.verseEnd === undefined)) ||
        (m.verseStart !== undefined && (!Number.isInteger(m.verseStart) || m.verseStart < 1 ||
          !Number.isInteger(m.verseEnd) || m.verseEnd! < m.verseStart))))) {
      throw new Error('The downloaded text is incomplete or has invalid passage mappings.');
    }
    ids.add(section.id);
  }
  return p;
}

export async function installedWorks(db: SQLiteDatabase) {
  return db.getAllAsync<InstalledWork>('SELECT * FROM library_downloads');
}

// A ready marker alone is not evidence that the local edition is readable.
// Check source tables only; repair must never remove personal content/positions.
export async function workAvailability(db: SQLiteDatabase, works: LibraryWork[]) {
  const downloads = await installedWorks(db);
  const sections = await db.getAllAsync<{ work_id: string; total: number; empty: number }>(`
    SELECT s.work_id,COUNT(*) AS total,
      SUM(CASE WHEN NOT EXISTS (
        SELECT 1 FROM library_paragraphs p
        WHERE p.work_id=s.work_id AND p.section_id=s.id AND LENGTH(TRIM(p.text))>0
      ) THEN 1 ELSE 0 END) AS empty
    FROM library_sections s GROUP BY s.work_id`);
  const notices = await db.getAllAsync<{ work_id: string; notices: string }>('SELECT * FROM library_notices');
  const henryMappings = await db.getAllAsync<{ book: number; chapter: number }>(`
    SELECT book,chapter FROM library_sections WHERE work_id='henry-whole-bible'
      AND book IS NOT NULL AND verse_start IS NULL AND verse_end IS NULL`);
  const mapped = new Set(henryMappings.map(row => `${row.book}:${row.chapter}`));
  const henryComplete = BOOKS.every(book =>
    Array.from({ length: book.chapters }, (_, index) => `${book.id}:${index + 1}`).every(key => mapped.has(key)));
  return works.map(work => {
    const marker = downloads.find(row => row.work_id === work.id);
    const content = sections.find(row => row.work_id === work.id);
    const notice = notices.find(row => row.work_id === work.id);
    let validNotices = false;
    if (notice) {
      try {
        const parsed: unknown = JSON.parse(notice.notices);
        validNotices = Array.isArray(parsed) && parsed.length > 0 && parsed.every(n => typeof n === 'string');
      } catch { /* An invalid local notice is an incomplete install, not no coverage. */ }
    }
    const complete = !!work.package && !!marker &&
      marker.revision === work.package.revision && marker.bytes === work.package.bytes &&
      content?.total === work.package.sections && !content.empty && validNotices &&
      (work.id !== 'henry-whole-bible' || henryComplete);
    return { work_id: work.id, state: work.blocker ? 'rights' as const : complete ? 'ready' as const
      : marker || content || notice ? 'incomplete' as const : 'download' as const };
  });
}

export async function installWork(db: SQLiteDatabase, work: LibraryWork, value: unknown,
  onProgress: (fraction: number) => void = () => {}) {
  const p = validatePackage(value, work);
  // A single transaction means interrupted imports never appear as ready.
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM library_paragraphs WHERE work_id=?', work.id);
    await db.runAsync('DELETE FROM library_sections WHERE work_id=?', work.id);
    type Values = (string | number | null)[][];
    const writeBatch = async (
      table: 'library_sections' | 'library_paragraphs', columns: string, rows: Values,
    ) => {
      if (!rows.length) return;
      const placeholders = rows.map(row => `(${row.map(() => '?').join(',')})`).join(',');
      await db.runAsync(`INSERT INTO ${table} (${columns}) VALUES ${placeholders}`, ...rows.flat());
      rows.length = 0;
    };
    // Keep every statement below the conservative 999 SQLite bind limit, while
    // avoiding tens of thousands of JS/native or web-worker round trips.
    for (let offset = 0; offset < p.sections.length; offset += 40) {
      const group = p.sections.slice(offset, offset + 40);
      const sectionRows: Values = group.map((s, index) => [
        work.id, s.id, offset + index, s.title, s.sourceUrl, s.attribution,
        s.scripture?.book ?? null, s.scripture?.chapter ?? null,
        s.scripture?.verseStart ?? null, s.scripture?.verseEnd ?? null,
      ]);
      await writeBatch('library_sections',
        'work_id,id,ordinal,title,source_url,attribution,book,chapter,verse_start,verse_end',
        sectionRows);
      const paragraphRows: Values = [];
      for (const s of group) {
        for (let i = 0; i < s.paragraphs.length; i++) {
          paragraphRows.push([work.id, s.id, i, s.paragraphs[i]]);
          if (paragraphRows.length === 100) {
            await writeBatch('library_paragraphs', 'work_id,section_id,paragraph,text', paragraphRows);
          }
        }
      }
      await writeBatch('library_paragraphs', 'work_id,section_id,paragraph,text', paragraphRows);
      onProgress((offset + group.length) / p.sections.length);
    }
    await db.runAsync('INSERT OR REPLACE INTO library_notices VALUES (?,?)', work.id, JSON.stringify(p.notices));
    await db.runAsync('INSERT OR REPLACE INTO library_downloads VALUES (?,?,?)',
      work.id, p.revision, work.package!.bytes);
  });
  onProgress(1);
}

export async function removeWork(db: SQLiteDatabase, workId: string) {
  await db.withTransactionAsync(async () => {
    for (const table of ['library_paragraphs', 'library_sections', 'library_notices', 'library_downloads']) {
      await db.runAsync(`DELETE FROM ${table} WHERE work_id=?`, workId);
    }
  });
}

export async function sectionsForWork(db: SQLiteDatabase, id: string) {
  return db.getAllAsync<SectionSummary>('SELECT id,title,ordinal FROM library_sections WHERE work_id=? ORDER BY ordinal', id);
}
export async function readSection(db: SQLiteDatabase, workId: string, sectionId: string) {
  const meta = await db.getFirstAsync<{ title: string; source_url: string; attribution: string }>(
    'SELECT title,source_url,attribution FROM library_sections WHERE work_id=? AND id=?', workId, sectionId);
  if (!meta) throw new Error('This section is not downloaded. Return to the work and download it again.');
  const paragraphs = await db.getAllAsync<{ paragraph: number; text: string }>(
    'SELECT paragraph,text FROM library_paragraphs WHERE work_id=? AND section_id=? ORDER BY paragraph', workId, sectionId);
  if (!paragraphs.length) throw new Error('This downloaded section has no readable text. Return to the work details, remove the incomplete download and download it again.');
  return { ...meta, paragraphs };
}
export async function getLibraryPosition(db: SQLiteDatabase, id: string) {
  return db.getFirstAsync<ReadingPosition>('SELECT section_id,paragraph FROM library_positions WHERE work_id=?', id);
}
export async function saveLibraryPosition(db: SQLiteDatabase, id: string, sectionId: string, paragraph: number) {
  await db.runAsync('INSERT OR REPLACE INTO library_positions VALUES (?,?,?)', id, sectionId, paragraph);
}
export async function workNotices(db: SQLiteDatabase, id: string): Promise<string[]> {
  const row = await db.getFirstAsync<{ notices: string }>('SELECT notices FROM library_notices WHERE work_id=?', id);
  return row ? JSON.parse(row.notices) : [];
}

export async function searchLibrary(db: SQLiteDatabase, term: string, workIds: string[]) {
  if (!term.trim() || !workIds.length) return [];
  const escaped = term.trim().replace(/[\\%_]/g, c => `\\${c}`);
  return db.getAllAsync<LibraryHit>(`
    SELECT p.work_id,p.section_id,p.paragraph,p.text,s.title
    FROM library_paragraphs p
    JOIN library_sections s ON s.work_id=p.work_id AND s.id=p.section_id
    JOIN library_downloads d ON d.work_id=p.work_id
    WHERE p.work_id IN (${workIds.map(() => '?').join(',')}) AND p.text LIKE ? ESCAPE '\\'
    ORDER BY p.work_id,s.ordinal,p.paragraph LIMIT 100`, ...workIds, `%${escaped}%`);
}
// An introduction is a fallback when no verse-specific source entry exists.
// Full chapter commentaries (such as Henry) remain available alongside verses.
export async function commentaryForPassage(db: SQLiteDatabase, book: number, chapter: number, verse?: number) {
  return db.getAllAsync<PassageMatch>(`SELECT s.work_id,s.id,s.title,s.verse_start,s.verse_end FROM library_sections s
    JOIN library_downloads d ON d.work_id=s.work_id
    WHERE s.book=? AND s.chapter=? AND
      (? IS NULL OR
       (s.verse_start IS NULL AND (
         s.id NOT LIKE '%-intro' OR NOT EXISTS (
           SELECT 1 FROM library_sections exact
           WHERE exact.work_id=s.work_id AND exact.book=s.book AND exact.chapter=s.chapter
             AND exact.verse_start IS NOT NULL AND ? BETWEEN exact.verse_start AND exact.verse_end
         )
       )) OR (? BETWEEN s.verse_start AND s.verse_end))
    ORDER BY s.work_id,s.ordinal`, book, chapter, verse ?? null, verse ?? null, verse ?? null);
}
