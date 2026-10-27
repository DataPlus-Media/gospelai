# Native sign-in startup and recovery

## Diagnosis and limits

All providers depend on one Clerk startup. Previously, unloaded resources disabled
email and provider actions without disabled styling, while the timeout only
suggested closing the app. There was no retry action and no early handling of the
SDK's startup-error status. This demonstrates a recovery/UI defect; it does **not**
establish why a particular installed iPhone build failed to initialize.

The existing external Clerk account is preserved. Replit workspace management
detection does not describe the configuration embedded by EAS. No tenant,
provider credentials, account policies, or callback registrations were changed.

On 2026-10-27, the workspace's public frontend hostname,
`precise-spider-24.clerk.accounts.dev`, returned HTTP 200 from
`/v1/environment?_is_native=1` with `x-mobile: 1`, with normal TLS certificate
validation. This is a development hostname, **not confirmation that TestFlight
uses this instance**, and does not validate device connectivity, cached sessions,
or provider authorization. No user-account requests were used for this check.

## Recovery behavior

- Sign-in, registration, verification, password reset, Apple, and Google share
  one readiness gate. Fields remain editable; unavailable actions are visibly
  disabled. Connecting is separate from submitting a request.
- SDK startup errors appear immediately; otherwise, a 12-second wait reveals
  recovery guidance. If Clerk subsequently loads, controls become available
  without a restart. No request is automatically submitted from typed details.
- Retry uses Expo's public `reloadAppAsync` on native, supported in debug and
  release builds, and browser reload on web. It reloads the same bundle rather
  than fetching an update. A provider-only remount would reuse Expo Clerk's
  native singleton and is not a reliable retry.
- A reload discards typed credentials and incomplete verification. It does not
  delete SecureStore, sessions, local study, or databases. Native may return to
  the welcome screen; reopen sign-in there. If reload fails, the screen offers
  manual restart guidance and still permits guest study.
- Recovery details contain only the validated public hostname, test/live label,
  app version, build number, and allowlisted startup state. No key, tokens,
  identifiers, raw API errors, or form contents are logged/displayed in these
  diagnostics. Known API error codes map to app-authored messages; unknown
  errors receive a generic action-specific message.
- Existing session activation, Today navigation, verification, provider
  cancellation, and OAuth transfer-to-registration behavior remain in place.

## EAS configuration and rebuild requirements

These source changes do not update an installed TestFlight binary. A new EAS iOS
build must include them; nothing was submitted or published as part of this work.

1. In the existing EAS project's environment used by the build profile, ensure
   `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` belongs to the intended **existing external
   Clerk instance**. Keep secrets in secure tooling, not chat or source.
   `eas.json` intentionally does not hardcode a key or choose a different tenant.
2. The `eas-build-post-install` check loads configuration using Expo's dotenv
   behavior, with injected EAS variables taking precedence, and fails if the public key is missing
   or malformed, and prints only its public hostname and test/live label.
   It does not validate ownership, tenant policies, network access, or callbacks.
   A test key is reported, not silently replaced or rejected.
3. Compare that safe build-log hostname with the stalled screen's Service and
   Build details on the physical iPhone. For an older binary without these
   details, confirm its EAS build record/environment first. Do not infer its
   configuration from this workspace.
4. Check DNS/TLS and Native API settings for **that** hostname. If the installed
   binary references the wrong instance or a broken domain, correct the EAS
   configuration for the existing account and rebuild. Retry cannot change an
   embedded key or repair external DNS.
5. Preserve the `gospelsai` scheme and `oauth-native-callback` path. Verification
   of real Apple/Google callback delivery is a separate existing task.

## Checks actually run

Run from the project root:

```sh
npm run test:auth
npm run test:auth:browser
npx tsc --noEmit
npx eslint app/login.tsx hooks/useAuthStartup.ts utils/authStartup.ts utils/clerkAuth.ts utils/clerkOAuth.ts
npx expo export --platform ios --platform android --output-dir generated-artifacts/auth-native-export
npm run build:web
```

- Helper tests: unloaded, delayed ready, early startup error, timeout, timer/
  listener cleanup, supported reload invocation/failure, sanitized public
  configuration, EAS missing/invalid-key rejection, session activation,
  verification continuations, provider browser launch, cancellation, transfer,
  and callback error cases.
- Chromium against the running app at 390×844: both sign-in and registration,
  editable fields during stalled startup, disabled controls, timeout recovery,
  delayed readiness, working retry/reload, discarded form contents, email
  submission progress, both provider entry-point requests, error recovery, and
  guest navigation to Today. SDK download is deliberately held for startup
  tests. Authentication API requests are intercepted with synthetic failures;
  no real account is created or signed in.
- iOS and Android Hermes JavaScript exports and the production web export.
  These are **not** Xcode/Gradle builds or simulator/device execution.
- A visual screenshot of the running sign-in page.

**Not run:** iOS Simulator, Android emulator, physical iPhone/Android, TestFlight,
live account sign-in/registration/verification, existing-session restoration
after native reload, real provider authorization or native return callbacks.
No simulator/device access or signed EAS build was available here.

## Device verification still required

Using safe test accounts in the intended instance:

1. On the updated iPhone build, record only version/build and public Service
   details. Confirm the intended instance before changing provider settings.
2. Healthy Wi-Fi/cellular: submit email sign-in and registration, observe progress,
   complete any verification, and confirm Today opens.
3. Cold launch without connectivity: open both forms, type, wait for recovery,
   confirm guest study stays usable. Restore connectivity and test delayed
   readiness and Retry. Repeat with a previously saved session; do not clear it.
4. Start Apple and Google authorization; cancel and confirm another option remains
   usable. Complete real native callbacks under the existing callback-verification
   task, rather than counting mocked tests as a device pass.
5. Repeat startup/retry checks on Android. Report actual results and any safe
   error category, never credentials, tokens, or full provider response bodies.
