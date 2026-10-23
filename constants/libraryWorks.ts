import type { LibraryWork } from '@/utils/libraryTypes';
import manifest from './libraryManifest.json';

export const LIBRARY_AUTHORS = ['Matthew Henry', 'John Gill', 'Charles Spurgeon'] as const;
export const LIBRARY_WORKS: LibraryWork[] = [
  {
    id: 'henry-whole-bible',
    author: 'Matthew Henry',
    title: 'Commentary on the Whole Bible',
    kind: 'commentary',
    edition: 'CCEL legacy MHC2 unabridged electronic edition; work published 1706–1721',
    sourceUrl: 'https://www.ccel.org/h/henry/mhc2/MHC00000.HTM',
    rightsUrl: 'https://www.ccel.org/h/henry/mhc2/MHC00000.HTM',
    rights: 'Public domain text. No rights reserved. May be distributed freely.',
    attribution: 'Matthew Henry through Acts. Romans–Revelation completed after his death by other ministers, using his notes. Each affected chapter names its contributor; the original Volume VI preface is preserved.',
    package: manifest['henry-whole-bible'],
  },
  {
    id: 'gill-exposition',
    author: 'John Gill',
    title: 'Exposition of the Old and New Testaments',
    kind: 'commentary',
    edition: 'SermonIndex MyBible module SI-GILL; source module metadata identifies it as public domain',
    sourceUrl: 'https://www.sermonindex.net/commentary/gill/',
    rightsUrl: 'https://www.sermonindex.net/commentary/gill/',
    rights: 'SermonIndex identifies this edition as public domain and states it is free to copy, share and build on.',
    attribution: 'John Gill (1697–1771). Electronic module prepared by SermonIndex.net.',
    package: manifest['gill-exposition'],
  },
  {
    id: 'spurgeon-expositions',
    author: 'Charles Spurgeon',
    title: 'Commentary and Expositions',
    kind: 'commentary',
    edition: 'SermonIndex MyBible module SI-SPURGEON; 997 sections across 639 chapters in 59 books. Selective coverage, not every verse.',
    sourceUrl: 'https://www.sermonindex.net/commentary/spurgeon/',
    rightsUrl: 'https://www.sermonindex.net/commentary/spurgeon/',
    rights: 'Public domain — free to copy, share and build on (source page and module notice).',
    attribution: 'Charles Haddon Spurgeon (1834–1892). Electronic compilation prepared by SermonIndex.net, including Psalms material from The Treasury of David. This is not the StudyLight edition.',
    package: manifest['spurgeon-expositions'],
  },
  {
    id: 'spurgeon-morning-evening',
    author: 'Charles Spurgeon',
    title: 'Morning and Evening',
    kind: 'devotional',
    edition: 'CCEL legacy morn_eve text; scanned from Hendrickson edition and cleaned/formatted by Ernie Stefanik',
    sourceUrl: 'https://ccel.org/s/spurgeon/morn_eve/morn_eve.html',
    rightsUrl: 'https://ccel.org/s/spurgeon/morn_eve/MEDOC.html',
    rights: 'Public Domain — Copy Freely (edition-specific notice).',
    attribution: 'Charles Haddon Spurgeon. Scanned text cleaned and formatted by Ernie Stefanik. Original wording, not a modern adaptation.',
    appAccessBlocker: 'This work is currently unavailable for reading in the app.',
    package: manifest['spurgeon-morning-evening'],
  },
  {
    id: 'spurgeon-treasury',
    author: 'Charles Spurgeon',
    title: 'The Treasury of David',
    kind: 'commentary',
    edition: 'Original work 1869–1885; complete searchable edition not yet cleared',
    sourceUrl: 'https://www.ccel.org/ccel/spurgeon/treasury1.html',
    rightsUrl: 'https://ccel.org/about/copyright.html',
    rights: 'CCEL identifies its Volume I scan as public domain, but this is an images-only edition. A complete, rights-verified searchable edition has not been imported.',
    attribution: 'Charles Haddon Spurgeon, with quoted authors as credited in the original work.',
    blocker: 'Edition blocker: CCEL’s verified Volume I is images only, not a complete searchable text. Other electronic editions have unresolved redistribution terms. No substitute excerpts are included.',
  },
  {
    id: 'spurgeon-all-grace',
    author: 'Charles Spurgeon',
    title: 'All of Grace',
    kind: 'book',
    edition: 'Original work 1886; CCEL electronic edition dated 2000-07-09 not cleared',
    sourceUrl: 'https://www.ccel.org/ccel/spurgeon/grace.html',
    rightsUrl: 'https://ccel.org/about/copyright.html',
    rights: 'The historical work is public domain, but CCEL’s edition has no work-specific rights statement. Its general policy asks for permission to republish or use commercially.',
    attribution: 'Charles Haddon Spurgeon',
    blocker: 'Rights blocker: redistribution permission for the specific electronic edition has not been established. No text has been imported.',
  },
];

export function libraryWork(id: string) {
  const work = LIBRARY_WORKS.find(w => w.id === id);
  if (!work) throw new Error('Unknown library work.');
  return work;
}
