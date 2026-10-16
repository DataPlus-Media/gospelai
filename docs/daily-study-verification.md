# Daily study verification

## Repeatable checks

- `npm run test:study` runs the real migration and study helpers against Python's SQLite, including fresh, version 1 and version 2 databases. It checks preservation of chats/messages/notes, independent bookmarks and highlights, removal, position, all seven plan completions, idempotence, reset and reference ranges in the bundled KJV database. It also tests guest and signed-in entry decisions and the draft formatter.
- `npm run test:study:browser` uses Playwright and Chromium against `STUDY_TEST_URL` (defaults to the Replit development domain). Set `PLAYWRIGHT_MODULE` to an installed Playwright package path and optionally `CHROMIUM_PATH`. It uses a fresh browser context, not real account credentials.
- `npx expo export --platform all --output-dir generated-artifacts/export` checks web, Android and iOS JavaScript bundling. This does **not** compile or launch a native app.

The browser flow checks welcome/free entry, Today, daily scripture, plan start/completion/reload, exact saved-verse opening, bookmark/highlight persistence/removal, notes/copy, reading-position reload, plan reset/cancel, and chat header return. It verifies the draft contains selected KJV text, is editable, does not autofocus, and makes no chat request until Send. It aborts the first chat request and stubs the retry reply to check retry behavior without relying on the remote AI service. That is not a live AI response test.

## Platform boundaries

- Native reading uses the bundled KJV SQLite file. Study state uses additive tables in the existing `chat.db`; existing chats and notes are not replaced. No sign-in or cloud-sync requirement was added.
- The web Bible database loader is platform-specific and does not import the native filesystem loader. Web SQLite requires local browser storage and cross-origin isolation. Metro supplies `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` in development. Any future static web host must also supply those headers. Multiple browser tabs can contend for the same SQLite file; the recovery screen instructs users to close other tabs and reload without clearing data.
- The root guard's signed-in entry decisions are covered by automated tests, but a real signed-in UI session was **not** verified. No user credentials were requested and auth was not bypassed.
- No iOS/Android device or simulator was available. Native cold-start persistence, airplane-mode reading/saved items/plan progress, actual software-keyboard behavior, clipboard, and native authentication must still be checked on devices. Browser tests and successful native bundles are not evidence that these device checks passed.

## Existing project-wide check issues

`npx tsc --noEmit` exposes two pre-existing, unrelated errors: `hooks/useThemeColor.ts` imports a nonexistent named `Colors` export, and the unused `utils/Storage.ts` imports the absent `react-native-mmkv` package. The study implementation does not use that storage helper. These are not suppressed or represented as a passing project-wide type check.
