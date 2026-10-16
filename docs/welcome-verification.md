# Welcome-page verification

## Automated and browser checks

- `npm run test:welcome:browser` exercises 320×568 small-phone, 568×320 landscape, 390×844 phone and 1440×900 web layouts; scroll reachability; doubled browser text; initial and live reduced-motion preferences; browser AppState pause/resume (synthetic visibility events); unfocused/modal lifecycle; decorative pointer behavior; guest navigation into Today; both account modal modes; and Google OAuth request handoff.
- The OAuth request is deliberately aborted. This verifies the button starts the existing Clerk flow, **not** a completed Google login. Apple stays hidden on web, as before.
- The browser test waits for Expo's client tree before acting; its initial server-rendered shell is replaced and is not an interactive-ready signal.
- `npm run test:study:browser` uses the new guest button label and checks the existing local study flow.
- `npm run lint` passes with the existing settings hook dependency warning.
- Project-wide `npx tsc --noEmit` still has the two existing failures documented in `daily-study-verification.md`: the named Colors import and missing react-native-mmkv import. No welcome-page type errors were observed.
- `npm run test:study` and `npm run test:release-lock` verify entry routing/local study behavior and portable dependency locking.
- `npx expo export --platform ios --platform android --output-dir generated-artifacts/welcome-native` successfully generated both native bundles. Generated files are excluded from Git and deployment.

The Reanimated patch stays on the existing 4.1 minor line. The older locked patch crashed at startup with browser reduced motion enabled, while logging its development warning before logger initialization. The updated patch initializes its logger on demand. It supports the project's React Native 0.81 and Worklets 0.5 versions. A native binary must be rebuilt rather than receiving this dependency change as a JavaScript-only update.

## Device and authentication limits

No physical iPhone, Android device, iOS simulator or Android emulator was available. Browser text enlargement is not Dynamic Type certification. Native bundle generation is not device testing.

Before a native release, check:

1. Small iPhone and Android portrait/landscape, notches and bottom/home-indicator safe areas.
2. Largest accessibility text: all copy wraps and every button remains reachable by scrolling.
3. Reduce Motion enabled **before cold launch**, live preference changes, background/resume and opening/closing the login modal. Text should remain visible throughout.
4. Immediate guest entry during animation; no motion continues on Today or reading screens.
5. VoiceOver/TalkBack labels and focus, press feedback and external keyboard access.
6. Real password login/registration, Apple and Google completion/cancellation/failure using authorized test accounts and the existing callback scheme. The signed-in UI and completed provider sessions were not verified here; authentication was not bypassed.
