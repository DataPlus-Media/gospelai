# Authors insight

> **Gill update verification:** Package integrity, verse mappings, offline database reads, rollback/retry, type checks and targeted lint checks pass. The real guest download and offline reader were exercised. In the full library browser regression, those download/offline and locked-work checks pass, but the later Henry selected-verse flow times out waiting for its original-reading button. Native iOS/Android verification remains required; this is not App Store build approval.

The user-facing feature is named **Authors insight**, with a navigation-menu destination, a Today shortcut, a visible Bible-page button for the current chapter, and a selected-verse action. Its internal `/library` route is retained for stable links.

The Bible connection uses canonical book/chapter/verse identifiers, not translation text. The chapter button does not assume verse 1; the verse action supplies an exact reference. Additional Bible translations are a future feature, not included here.

## Release status

Four verified edition packages are stored in private App Storage; three are currently available for guest download:

| Work | Imported contents | Download |
| --- | --- | --- |
| Matthew Henry, *Commentary on the Whole Bible* | All 1,189 Bible chapters, 66 book introductions, original contents and six volume prefaces | 39,487,522 bytes |
| John Gill, *Exposition of the Old and New Testaments* | 32,139 original sections: 1,049 chapter introductions and 31,090 verse-mapped entries across all 66 books | 56,562,523 bytes |
| Charles Spurgeon, *Morning and Evening* | 732 morning/evening entries, including February 29 | 1,544,618 bytes (app locked) |
| Charles Spurgeon, *Commentary and Expositions* | 997 sections in 639 chapters across 59 books; selective coverage | 13,945,598 bytes |

**Storage/build verification:** approved packages stay in private App Storage and are checksum-verified by the protected server endpoint. The public web export contains no package files. Deployment is configured for an Autoscale Node server; no publishing has been performed. Native release hosting configuration and device verification remain required before shipping an App Store update.

The following works are listed honestly but have no imported text or download button:

- **Spurgeon, The Treasury of David:** CCEL’s Volume I XML says “Public Domain” but describes an images-only edition, not a complete searchable text. The Spurgeon Archive’s page carries an all-rights-reserved notice. No complete electronic edition with resolved redistribution terms has been imported.
- **Spurgeon, All of Grace:** CCEL’s electronic edition has an empty `DC.Rights` field. Its general policy requests permission for republication/commercial use. The age of the original book alone has not been used to clear that electronic edition.

These are edition/rights blockers, not AI-generated substitutes or sample excerpts.

## Edition verification

### Henry

- Edition: CCEL legacy `mhc2`, *Commentary on the Whole Bible* (1706–1721).
- Rights evidence: <https://www.ccel.org/h/henry/mhc2/MHC00000.HTM>.
- Exact notice: **“Public domain text. No rights reserved. May be distributed freely.”**
- Source archives: `MHC-V1.ZIP` through `MHC-V6.ZIP`, linked from that contents page.
- Preserve the source’s Volume VI preface and its contributor list: <https://www.ccel.org/h/henry/mhc2/MHC00006.HTM>.
- Henry wrote through Acts. Romans–Revelation were completed by the named ministers using his notes. Each affected chapter has a contributor attribution, including John Evans (Romans), Simon Browne (1 Corinthians), Daniel Mayo (2 Corinthians and 1–2 Thessalonians), and the other contributors exactly as named in the source preface.
- Mapping is **chapter-level**. It must not be labeled as a precise explanation of a selected verse.

### Gill (2026-10-22)

- Edition: SermonIndex MyBible module `SI-GILL`, *Gill’s Exposition of the Entire Bible*: <https://www.sermonindex.net/modules/mybible/SI-GILL.commentaries.zip>.
- The module metadata identifies the edition as public domain, and the work page states **“Public domain — free to copy, share and build on.”** The app owner confirmed that this edition may be included in GospelAI.
- Original author: John Gill (1697–1771). Electronic module prepared by SermonIndex.net; attribution and chapter source links are retained in the package.
- The module contains 32,139 sections. Every canonical chapter has source coverage. Of 31,102 KJV verse references, 31,090 have an exact verse entry; 12 references have no verse-specific entry in the source. No commentary is invented for those gaps.
- Chapter introductions are explicitly titled and labeled **Chapter introduction**. For a selected verse they appear only when the source has no verse-specific entry; an exact verse entry takes precedence. On chapter entry, both introductions and verse entries remain available.
- The importer checks all module mappings against the bundled KJV, preserves exact verse/range mappings, and records the source edition’s notice. The source HTML is normalized into readable paragraphs; source wording is retained.

### Spurgeon: Commentary and Expositions

- The user chose this downloadable SermonIndex edition rather than online-only StudyLight links. These compilations differ; the app does not label the downloaded text as StudyLight's edition.
- Source and explicit public-domain notice: <https://www.sermonindex.net/commentary/spurgeon/>.
- Download: <https://www.sermonindex.net/modules/mybible/SI-SPURGEON.commentaries.zip>.
- The module contains 997 sections, including 22 chapter introductions, across 639 chapters in 59 Bible books. It includes Psalms material from *The Treasury of David* but is not represented as commentary on every verse or as a complete separately verified Treasury edition.
- Source verse ranges can overlap; separate expositions are retained rather than merged or generated. Only source-backed ranges are matched to a selected verse.
- One source metadata error records a cross-chapter reading, Revelation 20:11–15 and 21:1, as the impossible same-chapter range 20:11–21. Its original text remains readable but is deliberately excluded from passage matching. Nothing is silently clamped or fabricated.
- `node scripts/check-spurgeon.cjs` verifies package integrity, all canonical verse ranges, actual John 3:18/Psalms matching, honest gaps, offline SQLite reading and safe removal.
- `node scripts/check-spurgeon-browser.cjs` exercises the real phone-size guest download, return to John 3:18, and original-section reading with the browser offline.

### Morning and Evening

- Edition: CCEL legacy `morn_eve`; not a modern adaptation.
- Rights evidence: <https://ccel.org/s/spurgeon/morn_eve/morn_eve.html> and <https://ccel.org/s/spurgeon/morn_eve/MEDOC.html>.
- Exact notice: **“Public Domain -- Copy Freely.”**
- Source: <https://ccel.org/s/spurgeon/morn_eve/morn_eve-bod.html>.
- Source credit retained: scanned from the printed Hendrickson edition, cleaned and formatted by Ernie Stefanik.
- Devotional dates are structured. Incidental scripture quotations are not treated as verse-level commentary mappings.

### Other inspected evidence

- CCEL general policy: <https://ccel.org/about/copyright.html>.
- Gill edition and source statement: <https://www.sermonindex.net/commentary/gill/>.
- SermonIndex copying permissions: <https://www.sermonindex.net/md/copying-permissions/>.
- Treasury XML: <https://ccel.org/ccel/s/spurgeon/treasury1.xml>.
- Spurgeon Archive Treasury page: <https://www.romans45.org/spurgeon/treasury/treasury.htm>.
- All of Grace XML: <https://www.ccel.org/ccel/s/spurgeon/grace.xml>.

The edition-specific source notices and the app owner’s approval authorize these imported editions. No modern CCEL summaries, cover art, website navigation assets or modern adaptations are included. No Bible Standard assets or texts are used. Regional copyright law can differ; rights verification here is recorded for these source editions rather than asserted for every jurisdiction.

## Storage and build

1. In Replit, open **Tools → App Storage** and use this project's private bucket. The server's App Storage SDK uses the Replit runtime identity; no storage credentials are sent to the app.
2. Run `npm run library:import`. The importer downloads the CCEL sources and SermonIndex MyBible Gill and Spurgeon modules. Source archives, extracted module databases and generated packages live only under ignored `generated-artifacts/library/`.
3. Compare `generated-artifacts/library/manifest.json` against the committed small `constants/libraryManifest.json`. Import fails on missing chapters, invalid Gill mappings or empty sections. Do not update hashes blindly after a source change: verify the edition/rights and transformation first.
4. Run `npm run library:upload`. The official SDK uses the default App Storage bucket. If this environment cannot resolve the default, set the non-secret `LIBRARY_STORAGE_BUCKET_ID` to the unique **Bucket ID** in App Storage's **Settings** view, not its display name. Checksums are verified before upload. A bucket must belong to this project; an ID does not grant access to another project's bucket.
5. `npm run library:upload` sends the verified packages to private App Storage. `npm run build:web` removes any stale package files from `public/` and `dist/`, then runs Expo's web export without downloading or publishing book text. The public web build contains no library package files or storage SDK credentials.

The Replit Autoscale server serves the exported web app and `/library-packages/{revision}/{workId}.json` from the same origin. Before reading App Storage, the endpoint checks the work ID, the shared locked-work policy and exact package revision; returned bytes must match the committed manifest's length and SHA-256. Locked works are denied without a storage read. Available editions remain free to download as guests, and the app verifies and installs them locally for offline reading. The server sets the same COOP/COEP cross-origin isolation headers as Metro so web SQLite continues to work.

Large text packages are gzip-compressed when the client accepts gzip. Verification happens before compression; native and browser HTTP clients decompress the response before the app's existing SHA-256 and JSON checks. The manifest size/hash remain those of the original JSON. Publish the updated server to enable compressed delivery for existing native builds; a new EAS build is not required for this transport change. Server failure logs include the work, revision, phase and error type, but never book text or credentials.

Local web development continues through Metro's middleware, which applies that same access policy and checksum verification. It reads private App Storage; if working outside Replit, run `npm run library:import` and explicitly set `LIBRARY_DEV_LOCAL_IMPORT=1` to use the verified generated package as a development-only fallback. This fallback is not available in the server deployment. The configured post-merge setup only installs the lockfile dependencies; the server reads packages from App Storage when an allowed download is requested.

To unlock an app-locked work after the separate product and edition review, remove that work ID from `constants/libraryAccessPolicy.json`. The catalog's `appAccessBlocker` is derived from this shared policy, so the reader and server authorization change together. Do not remove an edition/rights `blocker` through this policy; unresolved or unimported editions remain unavailable. Re-run `npm run test:library:delivery` and the app library checks after any access-policy change.

Clean dependency installation was verified as well. The main project's patched Expo/Clerk dependencies and overrides for `tar` and `shell-quote` are preserved to avoid older releases blocked by the package security policy. The authentication provider and credentials were not changed. Merge setup uses a non-destructive install so a running Metro watcher does not lose its entry files before workflow reconciliation.

### GitHub / App Store build portability

The committed `.npmrc` uses npm's `omit-lockfile-registry-resolved` option so the lockfile retains exact dependency versions and integrity hashes but does not pin Replit's internal registry host. Each environment resolves those same locked packages using its own registry; Replit's package security policy remains in effect. Regeneration preserved every locked dependency version and integrity hash.

`npm run test:release-lock -- --install` checks this invariant and performs an isolated, empty-cache `npm ci` against the public npm registry without touching the running app's dependencies. The GitHub Actions workflow `.github/workflows/dependency-portability.yml` runs the same check on an external GitHub runner when the dependency files are pushed or a PR is opened. A local CI-style install is not evidence that an actual GitHub/EAS native release build has run; native build configuration and device checks remain separate prerequisites.

The portability check passed for all 1,469 locked dependency entries, including the empty-cache public-registry installation. No GitHub Actions or EAS release build was triggered from this workspace.

The web build now runs with the package endpoint in the same server deployment. Both the Node server and development Metro provide the cross-origin isolation headers required for web SQLite.

For a **native release build**, set `EXPO_PUBLIC_LIBRARY_BASE_URL` to the HTTPS origin of the server deployment before building. It is a public configuration value, not a credential. Do not guess a production domain or use the AI API origin: that service does not host these packages. Development builds use Expo’s dev host. A missing native release URL has an explicit error; previously downloaded works still read offline.

## Data safety and behavior

- Book text, installed markers, source notices and per-work positions use a separate `library.db`. Existing `chat.db`, Bible database and their migrations are unchanged.
- Separation prevents a long asynchronous book-import transaction from capturing unrelated note/chat writes.
- Downloads verify SHA-256 before validating the structured edition. Import is atomic. A failed/interrupted import never marks a partial work ready.
- Text removal is transactional and does **not** delete personal notes or saved reading position. Re-download can resume.
- Search is local, literal (SQL wildcard characters are escaped), scoped by author/title, and capped at 100 hits. Results contain exact stable section and paragraph positions.
- Notes explicitly say `library` and include author/work/section/paragraph attribution. Source text is labeled historical, not AI-generated.

## Verse-based source study

- Bible verse actions open the existing library route with canonical book/chapter/verse identifiers. The insight header retrieves the actual text from the bundled Bible database and labels it **King James Version (KJV)**. Chapter entry remains chapter-level and shows the full chapter; source matching never relies on translation wording.
- **Author Insights** opens the original downloaded section, preserving the contributor attribution, work, edition, section source link, rights link and installed edition notices. Coverage is explicitly **Whole chapter**, **Chapter introduction**, **Verse N**, or **Verses N–M**. Henry remains whole-chapter coverage; Gill retains the MyBible module’s verse mappings.
- **Compare** selects at most two downloaded commentary passages. Remove a selection to change it, or use Clear to reset both. Each panel retains the full original passage and provenance. Panels stack below 740px and sit side by side on wider layouts.
- Matthew Henry and John Gill are separate commentary sources. Henry provides a whole-chapter section; Gill provides exact verse entries and chapter introductions. Compare works only with sources downloaded on the device.
- Not downloaded, rights blocked, and downloaded-but-unmapped commentary are separate states with links to existing work details/download actions. *Morning and Evening* is explicitly separate devotional reading, has no verified verse mapping, and does not count as commentary. Source/rights web links require a connection; downloaded source text and comparison do not.
- Changing the selected scripture remounts passage state and clears comparison/source results. Existing full-work reading routes, saved positions, notes, bookmarks, highlights and guest access are retained.
- **Ask GospelAI about this source** is separate from source study. A cancellable disclosure opens an editable draft containing the selected scripture, translation, complete loaded section, precise coverage and attribution. Only Send submits the edited draft to the existing AI service. The screen does not generate/cache explanations or claim answers are original quotations or source-verified conclusions. AI requests require a connection.

## Verification

### Verse-availability diagnosis and regression checks

John 3:18 on a fresh library returns no *downloaded* rows. With the complete
verified Henry package installed, the same lookup returns `b43-c003`, the
original John 3 section with null verse boundaries (whole-chapter coverage).
No John book-ID, inclusive-range, or imported chapter mismatch was reproduced.
The reported screenshot by itself cannot establish that browser’s download
status. The old blanket empty message obscured the distinction between a
download not present and a passage not covered.

The passage now advertises Henry’s verified chapter coverage before download,
with the full-work 37.7 MB size and offline benefit. The author-row action opens
edition details; only the explicit download button fetches the complete work.
Successful installation returns automatically to the unchanged Bible passage.
Passage results reload on focus/return and verse changes. Download health checks
verify markers, revision, size, section counts, readable sections, notices and
all Henry chapter mappings. Incomplete source installs can be replaced without
removing notes or reading positions. Storage failures have their own retry state
and never become a no-coverage result.

The full canonical check also exposed a separate real mismatch: the bundled
Bible’s `book.id` values for Acts and Romans do not equal their canonical
`book_reference_id` values. Bible reading/search and insight Scripture loading
now translate at the Bible-storage boundary; library mappings and saved
canonical references are not rewritten. Regression checks verify Acts 17:1 and
Romans 1:1 text, as well as every Henry chapter at its first/last Bible verse.

The browser regression starts from Bible verse actions for John 3:18 on a fresh
device, exercises failed download/retry and automatic return, details/reader
return, storage-read failure/retry, removal/reinstall, damaged-source repair,
verse changes, and reopening downloaded original text offline inside the running
app. SQLite tests additionally close and reopen the Henry database and confirm
the stored original paragraph matches the verified package.

- `npm run test:study`: existing guest routing, migration preservation, notes, Bible progress, bookmarks, highlights and reading-plan tests.
- `npm run test:library`: real package checksums and coverage, including all Gill and Spurgeon sections, exact passage mappings, chapter-introduction fallback, invalid source ranges, Psalms mapping, offline persistence, safe removal, import/retry/rollback and note preservation.
- `npm run test:spurgeon:browser`: phone-sized guest download and original verse-section reading with the browser offline.
- `node scripts/check-library-browser.cjs`: isolated guest browser journey against the running development app. Requires Chromium (or `CHROMIUM_PATH`). Downloads the real Gill edition, opens its reader and original John 3:18 text, then exercises the other imported editions and a deliberately failed request to verify Retry.
- `npm run test:insight`: real bundled KJV text and reference validation; inclusive start/end range boundaries, exact verse and chapter matches; absent/incomplete section failures; source draft provenance.
- `npm run test:insight:browser`: actual Henry download; zero/single-source states; source/rights attribution; cancellable and editable AI handoff with no automatic send; source selection/removal/replacement/clear; narrow/wide panels; offline reading/comparison in the loaded app; verse-change reset; Romans contributor attribution. The two-source UI and devotional exclusion cases use explicitly named synthetic mappings **only in the isolated browser test database**. No such mappings, fabricated excerpts or extra editions ship. The AI response is stubbed; the existing external AI service was not used for verification.
- Targeted ESLint checks cover the new TypeScript modules and screens.
- Project-wide `npx tsc --noEmit` passes. The theme-color helper uses the project's default palette export; an unused legacy MMKV wrapper was removed instead of adding an undeclared native dependency.

### Limits

No iOS/Android device or simulator verification has been performed. Native download handling, interruption under OS backgrounding, cold-start offline reopening and low-storage behavior still need device checks. Browser offline verification means reopening downloaded text **inside the loaded app**; Expo’s development web server is not a service-worker/PWA and is not claimed to load its JavaScript from a cold offline browser refresh. Signed-in UI has not been verified.

Verse comparison was verified on web, not in an App Store build or on Android. Rights clearance and native release verification remain separate pending work. Targeted ESLint, project-wide TypeScript, study/library checks and the new insight checks pass.
