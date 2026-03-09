export interface VotdEntry {
  ref: string;
  book: string;
  bookId: number;
  chapter: number;
  verse: number;
}

const VERSES: VotdEntry[] = [
  { ref: 'John 3:16',            book: 'John',            bookId: 43, chapter: 3,  verse: 16 },
  { ref: 'Philippians 4:13',     book: 'Philippians',     bookId: 50, chapter: 4,  verse: 13 },
  { ref: 'Jeremiah 29:11',       book: 'Jeremiah',        bookId: 24, chapter: 29, verse: 11 },
  { ref: 'Psalms 23:1',          book: 'Psalms',          bookId: 19, chapter: 23, verse: 1  },
  { ref: 'Romans 8:28',          book: 'Romans',          bookId: 45, chapter: 8,  verse: 28 },
  { ref: 'Proverbs 3:5',         book: 'Proverbs',        bookId: 20, chapter: 3,  verse: 5  },
  { ref: 'Isaiah 40:31',         book: 'Isaiah',          bookId: 23, chapter: 40, verse: 31 },
  { ref: 'Matthew 6:33',         book: 'Matthew',         bookId: 40, chapter: 6,  verse: 33 },
  { ref: 'Romans 12:2',          book: 'Romans',          bookId: 45, chapter: 12, verse: 2  },
  { ref: 'Philippians 4:6',      book: 'Philippians',     bookId: 50, chapter: 4,  verse: 6  },
  { ref: 'Psalm 46:1',           book: 'Psalms',          bookId: 19, chapter: 46, verse: 1  },
  { ref: 'Galatians 5:22',       book: 'Galatians',       bookId: 48, chapter: 5,  verse: 22 },
  { ref: 'Ephesians 2:8',        book: 'Ephesians',       bookId: 49, chapter: 2,  verse: 8  },
  { ref: '1 Corinthians 13:4',   book: '1 Corinthians',   bookId: 46, chapter: 13, verse: 4  },
  { ref: 'Matthew 5:3',          book: 'Matthew',         bookId: 40, chapter: 5,  verse: 3  },
  { ref: 'John 14:6',            book: 'John',            bookId: 43, chapter: 14, verse: 6  },
  { ref: 'Hebrews 11:1',         book: 'Hebrews',         bookId: 58, chapter: 11, verse: 1  },
  { ref: 'Romans 5:8',           book: 'Romans',          bookId: 45, chapter: 5,  verse: 8  },
  { ref: 'Psalms 119:105',       book: 'Psalms',          bookId: 19, chapter: 119, verse: 105 },
  { ref: 'John 15:13',           book: 'John',            bookId: 43, chapter: 15, verse: 13 },
  { ref: '2 Timothy 1:7',        book: '2 Timothy',       bookId: 55, chapter: 1,  verse: 7  },
  { ref: 'Proverbs 31:25',       book: 'Proverbs',        bookId: 20, chapter: 31, verse: 25 },
  { ref: 'Isaiah 41:10',         book: 'Isaiah',          bookId: 23, chapter: 41, verse: 10 },
  { ref: 'Matthew 11:28',        book: 'Matthew',         bookId: 40, chapter: 11, verse: 28 },
  { ref: 'Psalms 27:1',          book: 'Psalms',          bookId: 19, chapter: 27, verse: 1  },
  { ref: 'Romans 8:38',          book: 'Romans',          bookId: 45, chapter: 8,  verse: 38 },
  { ref: 'Colossians 3:23',      book: 'Colossians',      bookId: 51, chapter: 3,  verse: 23 },
  { ref: 'Joshua 1:9',           book: 'Joshua',          bookId: 6,  chapter: 1,  verse: 9  },
  { ref: '1 John 4:19',          book: '1 John',          bookId: 62, chapter: 4,  verse: 19 },
  { ref: 'Micah 6:8',            book: 'Micah',           bookId: 33, chapter: 6,  verse: 8  },
  { ref: 'Ephesians 6:10',       book: 'Ephesians',       bookId: 49, chapter: 6,  verse: 10 },
  { ref: 'Psalms 34:8',          book: 'Psalms',          bookId: 19, chapter: 34, verse: 8  },
  { ref: 'John 10:10',           book: 'John',            bookId: 43, chapter: 10, verse: 10 },
  { ref: 'Lamentations 3:22',    book: 'Lamentations',    bookId: 25, chapter: 3,  verse: 22 },
  { ref: 'Proverbs 3:6',         book: 'Proverbs',        bookId: 20, chapter: 3,  verse: 6  },
  { ref: '2 Corinthians 5:17',   book: '2 Corinthians',   bookId: 47, chapter: 5,  verse: 17 },
  { ref: 'Mark 12:30',           book: 'Mark',            bookId: 41, chapter: 12, verse: 30 },
  { ref: 'Psalms 91:1',          book: 'Psalms',          bookId: 19, chapter: 91, verse: 1  },
  { ref: 'Romans 3:23',          book: 'Romans',          bookId: 45, chapter: 3,  verse: 23 },
  { ref: 'Hebrews 4:12',         book: 'Hebrews',         bookId: 58, chapter: 4,  verse: 12 },
  { ref: '1 Peter 5:7',          book: '1 Peter',         bookId: 60, chapter: 5,  verse: 7  },
  { ref: 'John 1:1',             book: 'John',            bookId: 43, chapter: 1,  verse: 1  },
  { ref: 'Psalms 37:4',          book: 'Psalms',          bookId: 19, chapter: 37, verse: 4  },
  { ref: 'Luke 6:38',            book: 'Luke',            bookId: 42, chapter: 6,  verse: 38 },
  { ref: '2 Chronicles 7:14',    book: '2 Chronicles',    bookId: 14, chapter: 7,  verse: 14 },
  { ref: 'Matthew 28:19',        book: 'Matthew',         bookId: 40, chapter: 28, verse: 19 },
  { ref: 'Revelation 3:20',      book: 'Revelation',      bookId: 66, chapter: 3,  verse: 20 },
  { ref: 'Isaiah 26:3',          book: 'Isaiah',          bookId: 23, chapter: 26, verse: 3  },
  { ref: 'James 1:2',            book: 'James',           bookId: 59, chapter: 1,  verse: 2  },
  { ref: 'Philippians 4:7',      book: 'Philippians',     bookId: 50, chapter: 4,  verse: 7  },
  { ref: 'Genesis 1:1',          book: 'Genesis',         bookId: 1,  chapter: 1,  verse: 1  },
  { ref: 'Psalms 16:8',          book: 'Psalms',          bookId: 19, chapter: 16, verse: 8  },
];

export function getTodaysVerse(): VotdEntry {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return VERSES[dayOfYear % VERSES.length];
}
