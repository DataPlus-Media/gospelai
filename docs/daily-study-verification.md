# Daily study verification

## Repeatable checks

- `npm run test:study` runs the real migration and study helpers against Python's SQLite, including fresh, version 1 and version 2 databases. It checks preservation of chats/messages/notes, independent bookmarks and highlights, removal, position, all seven plan completions, idempotence, reset and reference ranges in the bundled KJV database. It also tests guest and signed-in entry decisions and the draft formatter.
- `npm run test:study:browser` uses Playwright and Chromium against `STUDY_TEST_URL` (defaults to the Replit development domain). Set `PLAYWRIGHT_MODULE` to an installed Playwright package path and optionally `CHROMIUM_PATH`. It uses a fresh browser context, not real account credentials.
- `npx expo export --platform all --output-dir generated-artifacts/export` checks web, Android and iOS JavaScript bundling. This does **not** compile or launch a native app.

The browser flow checks welcome/free entry, Today without the seven-day reading-plan section, daily scripture, exact saved-verse opening, bookmark/highlight persistence/removal, notes/copy, reading-position reload, and chat header return. The reading-plan data and progress helpers continue to be checked by `npm run test:study`; the plan UI was removed from Today. It verifies the draft contains selected KJV text, is editable, does not autofocus, and makes no chat request until Send. It aborts the first chat request and stubs the retry reply to check retry behavior without relying on the remote AI service. That is not a live AI response test.

## Platform boundaries

- Native reading uses the bundled KJV SQLite file. Study state uses additive tables in the existing `chat.db`; existing chats and notes are not replaced. No sign-in or cloud-sync requirement was added.
- The web Bible database loader is platform-specific and does not import the native filesystem loader. Web SQLite requires local browser storage and cross-origin isolation. Metro supplies `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` in development. Any future static web host must also supply those headers. Multiple browser tabs can contend for the same SQLite file; the recovery screen instructs users to close other tabs and reload without clearing data.
- The root guard's signed-in entry decisions are covered by automated tests, but a real signed-in UI session was **not** verified. No user credentials were requested and auth was not bypassed.
- No iOS/Android device or simulator was available. Native cold-start persistence, airplane-mode reading/saved items/plan progress, actual software-keyboard behavior, clipboard, and native authentication must still be checked on devices. Browser tests and successful native bundles are not evidence that these device checks passed.

## Today and bottom navigation

- `node scripts/check-today-browser.cjs` checks guest Today at 320, 402, and 1024px widths, all four bottom destinations and current-page semantics, conversation-detail selection, reselecting chat without clearing it, exact locally saved reading-position navigation, start/reset/cancel, reachable library shortcuts, and the right-side drawer. AI requests are stubbed in a fresh browser context.
- `node scripts/check-drawer-browser.cjs` checks all original drawer destinations, local conversation options and persistence, guest auth links, and right-side positioning. The bottom bar is part of each drawer screen's layout, not overlaid on its scrolling content.
- `npx expo export --platform ios --output-dir generated-artifacts/today-ios` checks the iOS JavaScript bundle only. Actual iOS safe areas, large text, VoiceOver selection, native sharing, and the software keyboard alongside the bottom bar remain unverified without a device or simulator. The signed-in UI was not verified; guest browser flows do not establish signed-in device behavior.

## Project-wide type check

`npx tsc --noEmit` passes. The unused MMKV-based storage helper was removed rather than adding an undeclared native dependency; app data continues to use the existing SQLite, AsyncStorage and SecureStore paths.
