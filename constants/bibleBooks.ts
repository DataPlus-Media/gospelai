// constants/bibleBooks.ts

export type Testament = "OT" | "NT";

export type BibleBook = {
  id: number;           // 1..66
  name: string;         // Canonical KJV book name
  abbr: string;         // Common short name
  chapters: number;
  testament: Testament;
};

export const BOOKS: BibleBook[] = [
  { id: 1,  name: "Genesis",             abbr: "Gen",   chapters: 50, testament: "OT" },
  { id: 2,  name: "Exodus",              abbr: "Exod",  chapters: 40, testament: "OT" },
  { id: 3,  name: "Leviticus",           abbr: "Lev",   chapters: 27, testament: "OT" },
  { id: 4,  name: "Numbers",             abbr: "Num",   chapters: 36, testament: "OT" },
  { id: 5,  name: "Deuteronomy",         abbr: "Deut",  chapters: 34, testament: "OT" },
  { id: 6,  name: "Joshua",              abbr: "Josh",  chapters: 24, testament: "OT" },
  { id: 7,  name: "Judges",              abbr: "Judg",  chapters: 21, testament: "OT" },
  { id: 8,  name: "Ruth",                abbr: "Ruth",  chapters: 4,  testament: "OT" },
  { id: 9,  name: "1 Samuel",            abbr: "1Sam",  chapters: 31, testament: "OT" },
  { id: 10, name: "2 Samuel",            abbr: "2Sam",  chapters: 24, testament: "OT" },
  { id: 11, name: "1 Kings",             abbr: "1Kgs",  chapters: 22, testament: "OT" },
  { id: 12, name: "2 Kings",             abbr: "2Kgs",  chapters: 25, testament: "OT" },
  { id: 13, name: "1 Chronicles",        abbr: "1Chr",  chapters: 29, testament: "OT" },
  { id: 14, name: "2 Chronicles",        abbr: "2Chr",  chapters: 36, testament: "OT" },
  { id: 15, name: "Ezra",                abbr: "Ezra",  chapters: 10, testament: "OT" },
  { id: 16, name: "Nehemiah",            abbr: "Neh",   chapters: 13, testament: "OT" },
  { id: 17, name: "Esther",              abbr: "Esth",  chapters: 10, testament: "OT" },
  { id: 18, name: "Job",                 abbr: "Job",   chapters: 42, testament: "OT" },
  { id: 19, name: "Psalms",              abbr: "Ps",    chapters: 150, testament: "OT" },
  { id: 20, name: "Proverbs",            abbr: "Prov",  chapters: 31, testament: "OT" },
  { id: 21, name: "Ecclesiastes",        abbr: "Eccl",  chapters: 12, testament: "OT" },
  { id: 22, name: "Song of Solomon",     abbr: "Song",  chapters: 8,  testament: "OT" },
  { id: 23, name: "Isaiah",              abbr: "Isa",   chapters: 66, testament: "OT" },
  { id: 24, name: "Jeremiah",            abbr: "Jer",   chapters: 52, testament: "OT" },
  { id: 25, name: "Lamentations",        abbr: "Lam",   chapters: 5,  testament: "OT" },
  { id: 26, name: "Ezekiel",             abbr: "Ezek",  chapters: 48, testament: "OT" },
  { id: 27, name: "Daniel",              abbr: "Dan",   chapters: 12, testament: "OT" },
  { id: 28, name: "Hosea",               abbr: "Hos",   chapters: 14, testament: "OT" },
  { id: 29, name: "Joel",                abbr: "Joel",  chapters: 3,  testament: "OT" },
  { id: 30, name: "Amos",                abbr: "Amos",  chapters: 9,  testament: "OT" },
  { id: 31, name: "Obadiah",             abbr: "Obad",  chapters: 1,  testament: "OT" },
  { id: 32, name: "Jonah",               abbr: "Jonah", chapters: 4,  testament: "OT" },
  { id: 33, name: "Micah",               abbr: "Mic",   chapters: 7,  testament: "OT" },
  { id: 34, name: "Nahum",               abbr: "Nah",   chapters: 3,  testament: "OT" },
  { id: 35, name: "Habakkuk",            abbr: "Hab",   chapters: 3,  testament: "OT" },
  { id: 36, name: "Zephaniah",           abbr: "Zeph",  chapters: 3,  testament: "OT" },
  { id: 37, name: "Haggai",              abbr: "Hag",   chapters: 2,  testament: "OT" },
  { id: 38, name: "Zechariah",           abbr: "Zech",  chapters: 14, testament: "OT" },
  { id: 39, name: "Malachi",             abbr: "Mal",   chapters: 4,  testament: "OT" },

  { id: 40, name: "Matthew",             abbr: "Matt",  chapters: 28, testament: "NT" },
  { id: 41, name: "Mark",                abbr: "Mark",  chapters: 16, testament: "NT" },
  { id: 42, name: "Luke",                abbr: "Luke",  chapters: 24, testament: "NT" },
  { id: 43, name: "John",                abbr: "John",  chapters: 21, testament: "NT" },
  { id: 44, name: "Acts",                abbr: "Acts",  chapters: 28, testament: "NT" },
  { id: 45, name: "Romans",              abbr: "Rom",   chapters: 16, testament: "NT" },
  { id: 46, name: "1 Corinthians",       abbr: "1Cor",  chapters: 16, testament: "NT" },
  { id: 47, name: "2 Corinthians",       abbr: "2Cor",  chapters: 13, testament: "NT" },
  { id: 48, name: "Galatians",           abbr: "Gal",   chapters: 6,  testament: "NT" },
  { id: 49, name: "Ephesians",           abbr: "Eph",   chapters: 6,  testament: "NT" },
  { id: 50, name: "Philippians",         abbr: "Phil",  chapters: 4,  testament: "NT" },
  { id: 51, name: "Colossians",          abbr: "Col",   chapters: 4,  testament: "NT" },
  { id: 52, name: "1 Thessalonians",     abbr: "1Thess",chapters: 5,  testament: "NT" },
  { id: 53, name: "2 Thessalonians",     abbr: "2Thess",chapters: 3,  testament: "NT" },
  { id: 54, name: "1 Timothy",           abbr: "1Tim",  chapters: 6,  testament: "NT" },
  { id: 55, name: "2 Timothy",           abbr: "2Tim",  chapters: 4,  testament: "NT" },
  { id: 56, name: "Titus",               abbr: "Titus", chapters: 3,  testament: "NT" },
  { id: 57, name: "Philemon",            abbr: "Phlm",  chapters: 1,  testament: "NT" },
  { id: 58, name: "Hebrews",             abbr: "Heb",   chapters: 13, testament: "NT" },
  { id: 59, name: "James",               abbr: "Jas",   chapters: 5,  testament: "NT" },
  { id: 60, name: "1 Peter",             abbr: "1Pet",  chapters: 5,  testament: "NT" },
  { id: 61, name: "2 Peter",             abbr: "2Pet",  chapters: 3,  testament: "NT" },
  { id: 62, name: "1 John",              abbr: "1Jn",   chapters: 5,  testament: "NT" },
  { id: 63, name: "2 John",              abbr: "2Jn",   chapters: 1,  testament: "NT" },
  { id: 64, name: "3 John",              abbr: "3Jn",   chapters: 1,  testament: "NT" },
  { id: 65, name: "Jude",                abbr: "Jude",  chapters: 1,  testament: "NT" },
  { id: 66, name: "Revelation",          abbr: "Rev",   chapters: 22, testament: "NT" },
];

// Quick maps
export const BOOK_NAME_TO_ID: Record<string, number> =
  Object.fromEntries(BOOKS.map((b) => [b.name, b.id]));

export const BOOK_ID_TO_NAME: Record<number, string> =
  Object.fromEntries(BOOKS.map((b) => [b.id, b.name]));

// A few friendly aliases people type
export const BOOK_ALIASES: Record<string, string> = {
  "psalm": "Psalms",
  "psalms": "Psalms",
  "song of songs": "Song of Solomon",
  "canticles": "Song of Solomon",
  "song": "Song of Solomon",

  "1st samuel": "1 Samuel",
  "2nd samuel": "2 Samuel",
  "1st kings": "1 Kings",
  "2nd kings": "2 Kings",
  "1st chronicles": "1 Chronicles",
  "2nd chronicles": "2 Chronicles",
  "1st corinthians": "1 Corinthians",
  "2nd corinthians": "2 Corinthians",
  "1st thessalonians": "1 Thessalonians",
  "2nd thessalonians": "2 Thessalonians",
  "1st timothy": "1 Timothy",
  "2nd timothy": "2 Timothy",
  "1st peter": "1 Peter",
  "2nd peter": "2 Peter",
  "1st john": "1 John",
  "2nd john": "2 John",
  "3rd john": "3 John",

  // Abbreviations people often use
  "gen": "Genesis",
  "ex": "Exodus",
  "exod": "Exodus",
  "lev": "Leviticus",
  "num": "Numbers",
  "deut": "Deuteronomy",
  "josh": "Joshua",
  "judg": "Judges",
  "1sam": "1 Samuel",
  "2sam": "2 Samuel",
  "1kgs": "1 Kings",
  "2kgs": "2 Kings",
  "1chr": "1 Chronicles",
  "2chr": "2 Chronicles",
  "esth": "Esther",
  "eccl": "Ecclesiastes",
  "isa": "Isaiah",
  "jer": "Jeremiah",
  "lam": "Lamentations",
  "ezek": "Ezekiel",
  "dan": "Daniel",
  "hos": "Hosea",
  "obad": "Obadiah",
  "mic": "Micah",
  "nah": "Nahum",
  "hab": "Habakkuk",
  "zeph": "Zephaniah",
  "hag": "Haggai",
  "zech": "Zechariah",
  "mal": "Malachi",
  "matt": "Matthew",
  "rom": "Romans",
  "1cor": "1 Corinthians",
  "2cor": "2 Corinthians",
  "gal": "Galatians",
  "eph": "Ephesians",
  "phil": "Philippians",
  "col": "Colossians",
  "1thess": "1 Thessalonians",
  "2thess": "2 Thessalonians",
  "1tim": "1 Timothy",
  "2tim": "2 Timothy",
  "phlm": "Philemon",
  "heb": "Hebrews",
  "jas": "James",
  "1pet": "1 Peter",
  "2pet": "2 Peter",
  "1jn": "1 John",
  "2jn": "2 John",
  "3jn": "3 John",
  "rev": "Revelation",
};

const byLower = (s: string) => s.trim().toLowerCase();

// Normalize a user-typed book name to canonical (e.g., "psalm" -> "Psalms")
export function normalizeBookName(name: string): string | null {
  const n = byLower(name);
  // direct alias hit
  if (BOOK_ALIASES[n]) return BOOK_ALIASES[n];

  // exact by name
  const direct = BOOKS.find((b) => byLower(b.name) === n);
  if (direct) return direct.name;

  // try startsWith on canonical name or abbr
  const sw = BOOKS.find(
    (b) => byLower(b.name).startsWith(n) || byLower(b.abbr) === n || byLower(b.abbr).startsWith(n)
  );
  return sw ? sw.name : null;
}

export function findBook(name: string): BibleBook | undefined {
  const norm = normalizeBookName(name);
  if (!norm) return undefined;
  return BOOKS.find((b) => b.name === norm);
}

// Very light parser for refs like "John 3:16" / "1 Cor 13" / "Ps 23"
export function parseReference(ref: string):
  | { book: BibleBook; chapter?: number; verse?: number }
  | null {
  const clean = ref.replace(/\u00A0/g, " ").trim();
  const m = clean.match(/^(.+?)\s+(\d+)(?::(\d+))?$/); // book, chapter, opt verse
  if (m) {
    const bookName = normalizeBookName(m[1]);
    if (!bookName) return null;
    const book = BOOKS.find((b) => b.name === bookName)!;
    const chapter = Number(m[2]);
    const verse = m[3] ? Number(m[3]) : undefined;
    return { book, chapter, verse };
  }

  // Just a book name (e.g., "Genesis")
  const bookOnly = findBook(clean);
  if (bookOnly) return { book: bookOnly };

  return null;
}