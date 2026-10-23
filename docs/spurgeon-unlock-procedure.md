# Spurgeon edition unlock procedure

This is a maintainer guide for a possible future release. It is not a rights
opinion or a guarantee of public-domain status in every jurisdiction. Do not
make an edition available until its exact digital source and the complete
downloadable text package have both been reviewed and approved for this app.

**This guide changes no catalog or rights metadata. It unlocks no work and
deletes no local book text, notes, bookmarks, or reading positions.**

## Current catalog status

| Work | Current lock | What must happen before access changes |
| --- | --- | --- |
| Charles Spurgeon, *Morning and Evening* | **App-access lock.** `constants/libraryAccessPolicy.json` denies this work in both the app catalog and server endpoint. The catalog has an edition-specific CCEL “Public Domain -- Copy Freely” notice and a package entry in `constants/libraryManifest.json`; neither removes the separate product lock. | Confirm the exact CCEL legacy `morn_eve` edition and all scan/cleanup/formatting credits and rights remain appropriate for the proposed package. Validate the complete package and its checksums. Only then may the app-access lock be considered for removal. |
| Charles Spurgeon, *The Treasury of David* | **Edition blocker.** `blocker` in `constants/libraryWorks.ts` records that the cited CCEL Volume I material is images-only, not a complete searchable text, and other electronic editions have unresolved redistribution terms. There is no package entry for this title in `constants/libraryManifest.json`. | Identify a complete, searchable, exact electronic edition with explicit permission or source terms that allow its redistribution in this app. Import and validate that edition before considering removal of this title's blocker. |
| Charles Spurgeon, *All of Grace* | **Rights blocker.** `blocker` in `constants/libraryWorks.ts` records that redistribution permission for the cited CCEL electronic edition has not been established. Its `DC.Rights` field is empty and CCEL's general policy requests permission for republication/commercial use. There is no package entry for this title in `constants/libraryManifest.json`. | Obtain and record permission or other explicit, edition-specific redistribution evidence for the exact complete electronic text, then import and validate that edition before considering removal of this title's blocker. |

An **app-access lock** is a product decision encoded by
`constants/libraryAccessPolicy.json`; the catalog derives `appAccessBlocker`
from that shared policy and the package server enforces the same lock before
reading App Storage.
it does not claim that the edition is legally uncleared. An **edition/rights
blocker** is encoded by `blocker` and means the source edition is not cleared
for distribution. The app treats these separately: work cards and routes,
download/install validation, and the reader check both fields, while rights
availability is separately reflected by `workAvailability` in
`utils/library.ts`. Do not convert an unresolved rights blocker into an
app-access lock or remove a rights blocker merely because the historical work
is old.

The author's age or the original work's public-domain status alone does **not**
clear a modern scan, transcription, formatting, or electronic edition.

## Required evidence for each exact edition

Keep a review record tied to the exact source edition and package revision.
Before any code or catalog change, verify and record all of the following:

- **Complete, searchable text:** identify the source and edition, confirm that
  the package contains the complete work intended for release, and check that
  it is readable and searchable. Images, sample chapters, selected excerpts,
  and unrelated Spurgeon compilations do not satisfy this requirement.
- **Redistribution permission:** retain the exact edition-specific rights
  notice or written permission and its source URL or evidence. Confirm that it
  allows copying and redistribution of the text in this app and review its
  commercial-use terms for the app's distribution model. If the notice is
  ambiguous, missing, or narrower than the intended use, keep the work
  blocked and obtain clarification.
- **Attribution and notices:** preserve the author's and edition's required
  credits, source links, copyright/licence text, and any transformation notice
  in the package and catalog. Include third-party contributors exactly as
  required by the source.
- **Third-party material:** check rights in scans, transcription, proofreading,
  formatting, annotations, introductions, and other included material. A
  public-domain underlying text does not automatically clear these separately
  contributed elements. Exclude uncleared material or obtain permission for
  it.
- **Scope and review record:** retain the edition identifier, review date,
  evidence, relevant copying/commercial terms, approved package revision, and
  maintainer approval. Escalate legal uncertainty for qualified review; this
  checklist is not legal advice.

For the current sources, `docs/authors-library.md` records the known CCEL and
Spurgeon Archive findings and links. Those notes are evidence to revisit, not
blanket approval for a different source, edition, or package.

## Package and catalog workflow

Do not start by deleting a lock. First clear the evidence threshold above,
then produce and validate the package for that exact edition.

1. **Choose and document the edition.** Confirm a complete, searchable text
   source and permission for the app's intended distribution. Decide how the
   approved edition will be distinguished from similarly titled editions.
2. **Import only the approved source.** The current `scripts/import-library.py`
   builds the editions already configured there; it is not an importer for a
   new *Treasury of David* or *All of Grace* source. Do not treat its current
   output, an images-only scan, or an unrelated Spurgeon package as a substitute.
   Add or use a reproducible, source-specific import only after the source and
   transformation are approved. Keep source archives and generated package
   files under the existing ignored `generated-artifacts/library/` directory.
3. **Validate the full package.** Check the exact work ID and edition, expected
   section/date/chapter coverage, readable non-empty text, unique stable
   section IDs, source links, attribution, and package notices. Review the
   transformed text against the source, including any omitted or third-party
   content. Do not fill gaps with generated or substitute excerpts.
4. **Record the manifest only after review.** Compare the generated
   `generated-artifacts/library/manifest.json` entry with
   `constants/libraryManifest.json`. Confirm the package revision, byte length,
   SHA-256, and section count from the approved package; never copy hashes
   blindly after a source or transformation change.
5. **Verify storage and delivery.** `npm run library:upload` checks each
   manifest-listed generated package's byte length and SHA-256 before uploading
   it to App Storage. It uploads every entry in the manifest, so ensure all
   listed package files and the configured project bucket are available before
   running it. The package server checks manifest integrity before returning
   text. On-device, `utils/libraryDownload.ts` checks the downloaded response's
   SHA-256, and `utils/library.ts` validates the structured package before an
   atomic install. A missing, mismatched, malformed, incomplete, or blocked
   package must fail closed; it must not be installed or become readable.
6. **Update only the approved access or catalog entry.** In
   `constants/libraryWorks.ts`, set accurate edition, source and rights links,
   rights statement, attribution, and the approved package reference. For
   *Morning and Evening*, remove only its ID from
   `constants/libraryAccessPolicy.json` after the product decision and package
   validation; do not set a separate catalog-only unlock. For *The Treasury
   of David* or *All of Grace*, consider removing only that work's `blocker`
   after its edition rights and package are cleared. Keep every unrelated
   title's lock and metadata unchanged.
7. **Review all guards before release.** `utils/libraryTypes.ts` defines the
   two lock fields. Check that `utils/library.ts` package validation and
   availability, `utils/libraryDownload.ts`, `components/library/LibraryWorkCard.tsx`,
   `components/library/LibraryHome.tsx`, and
   `components/library/LibraryReader.tsx` continue to enforce the intended
   states. The home screen must reject stale/manual routes as well as normal
   taps; the reader and download/install paths must not bypass a lock.
   Preserve the UI's distinction between an unavailable app feature and
   unresolved edition rights.

## Verification before release

Run the library checks after a proposed catalog/package change:

- `npm run test:library` — checks manifest byte counts and SHA-256 hashes,
  structured package validation, rejection of blocked/incomplete downloads,
  offline database reading, and safe repair/removal behavior.
- `npm run test:library:delivery` — checks direct server requests for locked
  works, unknown IDs, mismatched revisions and successful verified guest
  delivery without requiring production storage access.
- `npm run test:library:browser` — with the development app and required
  browser environment available, exercises the guest library UI. It checks
  that all three current Spurgeon locks are inert, a stale route cannot open a
  locked reader, and an already-installed but app-locked *Morning and Evening*
  remains inaccessible without deleting its local text, note, or position.
- `npm run test:spurgeon:browser` — checks the existing downloadable Spurgeon
  commentary flow, including guest download, return to the selected passage,
  and reading original text offline in the loaded app. It is not proof that a
  newly added edition has been cleared or validated.

For every newly approved edition, also verify the actual proposed behavior:

- With the package absent, corrupt, incomplete, or carrying the wrong revision,
  the title remains unavailable and cannot be installed or opened, including
  by a manually supplied or stale reader route.
- With the approved manifest and package, the catalog shows the exact edition,
  correct source and rights details, attribution, and download size.
- A normal guest download succeeds only after the checksum and structured
  package checks pass; the full text, notices, and relevant coverage are
  correct.
- After installation, open and search original text offline in the loaded app,
  then close and reopen the app/database and confirm reading remains available.
  Confirm the source's actual coverage rather than implying complete scripture
  mapping for a devotional or selectively covered commentary.
- Confirm that any remaining lock or failed validation still prevents access.
  Do not remove user data to test a lock: existing local text, notes, bookmarks,
  and reading positions are not part of this documentation task and must not be
  deleted as part of an unlock.

This guide records a future approval and release procedure only. It does not
clear any of the three current locks, authorize any edition, import or replace
text, change checksums, or alter data already stored on devices.
