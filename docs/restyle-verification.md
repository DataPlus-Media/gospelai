# GospelAI visual redesign

The supplied reference guides the visual language only: near-black surfaces,
readable ivory text, ocean-blue, teal and sea-glass actions and selected states,
subtle brass outlines in Authors insight, and image-led Scripture. The drawer,
existing routes, reading plan, account flows,
local storage, author editions, access policy and support behavior are retained.
No social features, counters, new plans or bottom tabs were introduced.

## Image provenance

`assets/images/scripture-forest.jpg` is an original AI-generated decorative
landscape created for this redesign, not a photograph of an identified location
or an image copied from the reference. The optimized bundled JPEG is about 83 KB
and works without an image service or network connection. The generation original
is excluded in `generated-artifacts/`. The Scripture card uses a dark overlay
and high-contrast text independently of the scene's brightness.

## Repeatable checks

- `npx tsc --noEmit`
- `npm run test:auth`
- `npm run test:study`
- `npm run test:insight`
- `npm run test:library`
- `npm run test:library:browser`
- `npm run test:welcome:browser`
- `npm run test:drawer:browser`
- `PLAYWRIGHT_MODULE=@playwright/test npm run test:study:browser`
- `npm run test:restyle:browser` checks guest screens at 390 and 1440 pixels,
  rendered dark surfaces, page overflow, bundled Scripture image loading and
  its share tap target. Screenshots go to ignored `generated-artifacts/restyle/`.
- `npx expo export --platform all --output-dir generated-artifacts/restyle-export`
  checks web, Android and iOS JavaScript bundles, not native execution.

Browser tests default to the Replit development domain. Override their
individual test URL variables when necessary. Study and drawer tests stub AI
responses; welcome tests abort OAuth handoffs rather than completing real
provider login.

## Verification boundaries

No real signed-in account or native simulator/device is available in this
workspace. Authentication is not bypassed for screenshots. Signed-in Settings
and account actions cannot be visually verified here. Successful bundles and
responsive web tests do not prove native safe-area behavior, Dynamic Type,
software keyboard handling, native purchases, sharing, or device reduced-motion
behavior; those require iOS and Android device checks. Existing signed-in Settings
and author-library native verification tasks remain relevant.

The extended `npm run test:insight:browser` run passed source comparison,
original-text attribution, offline source reading, and editable AI disclosure
checks, but did not finish successfully. Separate attempts encountered a local
message-save failure and a SQLite transaction error while removing a large
download after rapid route transitions. The independent full library-browser
flow passed download, offline reading and removal. This intermittent extended-flow
failure is recorded rather than hidden; no storage or transaction behavior was
changed as part of the visual redesign.
