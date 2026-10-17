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
  (auth)/               # Main app routes (guests can study locally)
    (drawer)/           # Drawer navigation
    (modal)/            # Modal screens
  index.tsx             # Animated welcome screen
  login.tsx             # Login screen
assets/
  bible/kjv.sqlite      # KJV Bible SQLite database
  fonts/                # Custom fonts
  images/               # App images
components/             # Reusable UI components (MessageIdeas fetches AI suggestions from backend)
constants/              # Colors, styles, Bible books
hooks/                  # Custom React hooks
utils/                  # Local study, Bible, commentary and chat utilities
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

- **Notes**: Local SQLite notes table with `addNote`/`getNotes`/`deleteNote` helpers. The personal database schema is version 3 and also preserves reading progress, saved verses and plan completion. Notes can be saved from AI chat messages or Bible verse actions. Accessible via Notes screen in the drawer. Sources tracked as "chat" or "bible" with optional reference text.
- **Study**: Today, reading plans, saved verses and Authors insight use local storage; downloaded author texts have a separate library database. See `replit.md` and `docs/` for current feature and verification details.
- **Copy to clipboard**: Long-press on AI chat bubbles or Bible verses to copy text via `expo-clipboard`.

## Deployment

- Configured as **static** deployment
- Build: `npm run build:web` (prepares the verified library packages before export)
- Output: `dist/` directory
