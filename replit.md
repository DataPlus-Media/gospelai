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

- **Notes**: Local SQLite notes table (DB version 2) with `addNote`/`getNotes`/`deleteNote` helpers. Notes can be saved from AI chat messages (long-press) or Bible verses (long-press). Accessible via Notes screen in the drawer. Sources tracked as "chat" or "bible" with optional reference text.
- **Copy to clipboard**: Long-press on AI chat bubbles or Bible verses to copy text via `expo-clipboard`.
- **Full Bible Search**: Search icon in Bible screen header opens a full-screen search modal. Queries the KJV SQLite DB across all 31,000+ verses with 300ms debounce. Tapping a result navigates directly to that verse and highlights it.
- **Verse of the Day**: `utils/verseOfDay.ts` (52 curated verses, cycles daily). `components/VerseOfDay.tsx` displays a gold-accented card on the home/chat screen. Loads verse text from KJV SQLite on native, falls back to hardcoded KJV texts on web. Share button uses `Share.share()` for text sharing.
- **Shared Bible DB util**: `utils/bibleDb.ts` exports `openBibleDb()` used by both `Bible.tsx` and `VerseOfDay.tsx`.
- **Landing page**: `app/index.tsx` — marketing-style page for non-signed-in users with feature cards, scripture quote, and sign-in/register/OAuth buttons. "Continue without account" gives free access. Routing in `_layout.tsx` redirects signed-in users to chat, keeps signed-out users on landing page.
- **Support screen**: `components/Support.tsx` (native IAP) + `components/Support.web.tsx` (web fallback). Platform-specific file resolution prevents expo-iap crash on web.
- **Header home button**: "GospelAI" header in chat is tappable — navigates signed-out users to landing page, signed-in users to new chat.
- **Drawer auth footer**: Drawer footer conditionally shows user profile (signed in) or "Sign In" / "Create Account" buttons (signed out).

## Deployment

- Configured as **static** deployment
- Build: `npx expo export --platform web`
- Output: `dist/` directory
