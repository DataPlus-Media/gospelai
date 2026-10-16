# GospelAI branding assets

The refreshed artwork keeps the original visual direction: an ivory open Bible and cross on charcoal, paired with a burgundy leather Bible with gold lettering. The user requested new designs in the same style, not a screen redesign.

Two new master images were AI-generated for this app. Optimized, bundled PNGs replace the existing image paths, so login, chat, drawer and native configuration continue to use local artwork without network access.

| Asset | Use |
| --- | --- |
| `assets/images/logo-white.png` | Transparent ivory emblem for dark backgrounds |
| `assets/images/logo-dark.png` | Same emblem on a charcoal tile for existing logo placements |
| `assets/images/bible.png` | Burgundy Bible illustration used in Bible navigation |
| `assets/images/icon.png` | Opaque 1024 × 1024 native app icon |
| `assets/images/adaptive-icon.png` | Transparent, padded Android foreground |
| `assets/images/splash-icon.png` | Transparent launch-screen emblem |
| `assets/images/favicon.png` | Small charcoal-backed browser icon |

Android adaptive and splash backgrounds are `#121212`. Bundle IDs, app version, EAS project settings and navigation are unchanged. Native icon and splash changes require a new native build; they do not alter an already published App Store version.

Large generated masters are excluded from Git under `generated-artifacts/branding/` and backed up in the configured App Storage bucket at:

- `branding/gospelai/bible-cross/master.png`
- `branding/gospelai/burgundy-bible/master.png`

The app does not fetch these masters at runtime. Its optimized bundled artwork totals approximately 808 KB.
