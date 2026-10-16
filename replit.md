# GospelAI

A React Native / Expo app with web support, built for Christian faith — Bible reading, AI-powered chat, and spiritual guidance.

## Architecture

- **Framework**: Expo (SDK 54) with Expo Router for file-based routing
- **Platform**: React Native with `react-native-web` for web support
- **Bundler**: Metro (via `expo start --web`)
- **Auth**: Clerk (`@clerk/clerk-expo`)
- **Database**: SQLite (expo-sqlite, KJV Bible database in `assets/bible/kjv.sqlite`)
- **Backend API**: External Railway server (`EXPO_PUBLIC_API_BASE`)

## Project Structure

```
app/                    # Expo Router file-based routes
  _layout.tsx           # Root layout with Clerk auth
  (auth)/               # Study routes (guest access is intentional)
    (drawer)/           # Drawer navigation
    (modal)/            # Modal screens
  index.tsx             # Landing page for non-signed-in users (feature showcase + sign-in/register)
  login.tsx             # Login screen
assets/
  bible/kjv.sqlite      # KJV Bible SQLite database
  fonts/                # Custom fonts
  images/               # App images
components/             # Reusable UI components (MessageIdeas fetches AI suggestions from backend)
constants/              # Colors, styles, Bible books
hooks/                  # Custom React hooks
utils/                  # Utilities (Database with notes table, Storage, etc.)
types/                  # TypeScript type definitions
```

## Development

```bash
npm run web   # Start Expo web dev server on port 5000
```

### Key Configuration
- **Port**: 5000 (configured via `--port 5000` in `npm run web`)
- **Host**: Expo dev server binds to localhost:5000
- **Metro config**: Extended to support `.sqlite`, `.db`, `.wasm` assets

## Environment Variables

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk auth public key
- `EXPO_PUBLIC_API_BASE` - Backend Railway API URL
- `EXPO_PUBLIC_REVOLUT_LINK_ONCE` - Payment link (one-time)
- `EXPO_PUBLIC_REVOLUT_LINK_MONTHLY` - Payment link (monthly)

## Features

- **Local storage**: DB version 3 adds study tables to the existing `chat.db` without replacing chats/messages/notes. Notes retain `addNote`/`getNotes`/`deleteNote` helpers and can be saved from chat or Bible verse actions.
- **Copy to clipboard**: Long-press on AI chat bubbles or Bible verses to copy text via `expo-clipboard`.
- **Full Bible Search**: Search icon in Bible screen header opens a full-screen search modal. Queries the KJV SQLite DB across all 31,000+ verses with 300ms debounce. Tapping a result navigates directly to that verse and highlights it.
- **Verse of the Day**: `utils/verseOfDay.ts` (52 curated verses, cycles daily). `components/VerseOfDay.tsx` displays a gold-accented card on the home/chat screen. Loads verse text from KJV SQLite on native, falls back to hardcoded KJV texts on web. Share button uses `Share.share()` for text sharing.
- **Daily study**: Today connects daily KJV scripture, saved reading position, seven bundled reading-plan passages, chat and library shortcuts. Bible supports local bookmarks/highlights, exact saved-verse opening, copy/notes and an editable verse-to-chat draft. Plan completion and reset are explicit. Study state stays on the device.
- **Shared Bible DB util**: Native `utils/bibleDb.ts` opens the bundled SQLite file; `utils/bibleDb.web.ts` deserializes the bundled asset without native filesystem calls. Web SQLite needs cross-origin isolation headers, supplied by Metro in development and required on a future static host.
- **Landing page**: `app/index.tsx` preserves free guest welcome and sign-in/register/OAuth buttons. Continue opens Today; signed-in users enter Today.
- **Support screen**: `components/Support.tsx` (native IAP) + `components/Support.web.tsx` (web fallback). Platform-specific file resolution prevents expo-iap crash on web.
- **Header home button**: The GospelAI chat title returns both guests and signed-in users to Today. Chat drafts do not autofocus or auto-send; failures have a retry action.
- **Christian insight**: Guest-accessible Christian author books, linked from the drawer/menu, Today and the Bible page (chapter or selected verse). Canonical references keep links independent of future translations. Contains verified full Henry and Morning and Evening editions; Gill, Treasury of David and All of Grace show edition-rights blockers. Downloaded text and positions use a separate `library.db`; notes remain in `chat.db`. See `docs/authors-library.md` for provenance, App Storage setup and native-release configuration. Production static builds use `npm run build:web` to retrieve packages from App Storage; development uses `npm run library:import`.
- **Drawer auth footer**: Drawer footer conditionally shows user profile (signed in) or "Sign In" / "Create Account" buttons (signed out).

## Deployment

- Configured as **static** deployment
- Build: `npm run build:web` (verified library packages from App Storage, then Expo export)
- Output: `dist/` directory

## Study verification

See `docs/daily-study-verification.md` for repeatable checks and explicit native/signed-in verification limits. `npm run test:study` tests migrations and study behavior using SQLite. Browser checks are separate from native-device checks.
