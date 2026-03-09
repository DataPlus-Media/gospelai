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
  (auth)/               # Auth-protected routes
    (drawer)/           # Drawer navigation
    (modal)/            # Modal screens
  index.tsx             # Entry redirect
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

- **Notes**: Local SQLite notes table (DB version 2) with `addNote`/`getNotes`/`deleteNote` helpers. Notes can be saved from AI chat messages (long-press) or Bible verses (long-press). Accessible via Notes screen in the drawer. Sources tracked as "chat" or "bible" with optional reference text.
- **Copy to clipboard**: Long-press on AI chat bubbles or Bible verses to copy text via `expo-clipboard`.
- **Full Bible Search**: Search icon in Bible screen header opens a full-screen search modal. Queries the KJV SQLite DB across all 31,000+ verses with 300ms debounce. Tapping a result navigates directly to that verse and highlights it.
- **Verse of the Day**: `utils/verseOfDay.ts` (52 curated verses, cycles daily). `components/VerseOfDay.tsx` displays a gold-accented card on the home/chat screen, loads verse text from KJV SQLite. Share button lets users share as text or save a styled card image to camera roll (via `react-native-view-shot` + `expo-media-library`) to use as a photo widget.
- **Shared Bible DB util**: `utils/bibleDb.ts` exports `openBibleDb()` used by both `Bible.tsx` and `VerseOfDay.tsx`.

## Deployment

- Configured as **static** deployment
- Build: `npx expo export --platform web`
- Output: `dist/` directory
