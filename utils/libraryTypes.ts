export type ScriptureMapping = {
  book: number;
  chapter: number;
  // Omitted for chapter-level coverage. Never infer verses from a chapter.
  verseStart?: number;
  verseEnd?: number;
};

export type LibrarySection = {
  id: string;
  title: string;
  sourceUrl: string;
  attribution: string;
  paragraphs: string[];
  scripture?: ScriptureMapping;
  date?: string;
};

export type LibraryPackage = {
  schema: 1;
  workId: string;
  revision: string;
  notices: string[];
  sections: LibrarySection[];
};

export type LibraryWork = {
  id: string;
  author: 'Matthew Henry' | 'John Gill' | 'Charles Spurgeon';
  title: string;
  kind: 'commentary' | 'devotional' | 'book';
  edition: string;
  sourceUrl: string;
  rightsUrl: string;
  rights: string;
  attribution: string;
  blocker?: string;
  package?: { revision: string; bytes: number; sha256: string; sections: number };
};

export type InstalledWork = { work_id: string; revision: string; bytes: number };
export type ReadingPosition = { section_id: string; paragraph: number };
export type SectionSummary = { id: string; title: string; ordinal: number };
export type LibraryHit = {
  work_id: string; section_id: string; paragraph: number; title: string; text: string;
};
