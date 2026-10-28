import type { LibraryWork } from '@/utils/libraryTypes';
import manifest from './libraryManifest.json';
import accessPolicy from './libraryAccessPolicy.json';

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
    rights: 'The source says this text may be freely shared.',
    attribution: 'Matthew Henry through Acts. Romans–Revelation completed after his death by other ministers, using his notes. Each affected chapter names its contributor; the original Volume VI preface is preserved.',
    package: manifest['henry-whole-bible'],
  },
  {
    id: 'gill-exposition',
    author: 'John Gill',
    title: 'Exposition of the Old and New Testaments',
    kind: 'commentary',
    edition: 'SermonIndex digital edition SI-GILL',
    sourceUrl: 'https://www.sermonindex.net/commentary/gill/',
    rightsUrl: 'https://www.sermonindex.net/commentary/gill/',
    rights: 'SermonIndex says this edition is free to copy, share, and adapt.',
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
    rights: 'The source says this edition is free to copy, share, and adapt.',
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
    rights: 'The source marks this edition as free to copy and share.',
    attribution: 'Charles Haddon Spurgeon. Scanned text cleaned and formatted by Ernie Stefanik. Original wording, not a modern adaptation.',
    appAccessBlocker: accessPolicy.lockedWorkIds['spurgeon-morning-evening'],
    package: manifest['spurgeon-morning-evening'],
  },
  {
    id: 'spurgeon-treasury',
    author: 'Charles Spurgeon',
    title: 'The Treasury of David',
    kind: 'commentary',
    edition: 'Original work 1869–1885; a complete searchable edition is not available here',
    sourceUrl: 'https://www.ccel.org/ccel/spurgeon/treasury1.html',
    rightsUrl: 'https://ccel.org/about/copyright.html',
    rights: 'CCEL says the Volume I scan may be shared, but it is images only. A complete searchable edition is not included.',
    attribution: 'Charles Haddon Spurgeon, with quoted authors as credited in the original work.',
    blocker: 'The available Volume I is images, not searchable text. We haven’t confirmed whether other digital editions can be shared in the app, so no excerpts are included.',
  },
  {
    id: 'spurgeon-all-grace',
    author: 'Charles Spurgeon',
    title: 'All of Grace',
    kind: 'book',
    edition: 'Original work 1886; CCEL digital edition dated 2000-07-09',
    sourceUrl: 'https://www.ccel.org/ccel/spurgeon/grace.html',
    rightsUrl: 'https://ccel.org/about/copyright.html',
    rights: 'CCEL has no sharing note for this digital edition. Its general guidance asks people to check with them before republishing or using it commercially.',
    attribution: 'Charles Haddon Spurgeon',
    blocker: 'We haven’t confirmed that this digital edition can be shared in the app, so its text isn’t included.',
  },
];

export function libraryWork(id: string) {
  const work = LIBRARY_WORKS.find(w => w.id === id);
  if (!work) throw new Error('Unknown library work.');
  return work;
}
