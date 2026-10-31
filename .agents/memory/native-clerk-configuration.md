---
name: Native Clerk configuration
description: Keep the native app's external Clerk configuration separate from Replit-managed auth detection.
---
GospelAI's native EAS builds use the user's existing external Clerk account. Do not provision a new Replit-managed Clerk tenant as a fix for native sign-in errors.

**Why:** EAS receives configuration independently of the Replit workspace. A workspace management check reporting `not_configured` does not establish that a TestFlight build is missing its publishable key.

**How to apply:** Diagnose native sign-in against the build's existing external instance, registered app scheme, and returned authentication state. Never infer the native production configuration from workspace secrets alone.

## User-facing authentication errors

Keep technical system details out of sign-in and account-creation screens and alerts. Retain plain-language errors and recovery actions; engineering diagnostics must be sanitized and separate from user-facing messages.

**Why:** The user explicitly requested that failed authentication not show technical system reports to app users.

**How to apply:** Apply this to startup failures, email authentication and provider authentication. Do not treat hiding diagnostics as evidence that the underlying native sign-in failure is fixed.

## Native network failures

Keep Clerk's `rethrowOfflineNetworkErrors` enabled and treat an empty authentication status as a service failure, not as evidence that provider credentials or verification methods are missing.

**Why:** The installed Clerk SDK can swallow native fetch failures and return an unchanged, empty resource. This made email sign-up and both social providers report misleading continuation errors when the public sign-in hostname could not resolve.

**How to apply:** Check public DNS/reachability before sending the user through repeated OAuth credential setup. Mocked successful resource shapes alone do not verify native service connectivity.

## Startup retry

Use a supported full JavaScript app reload for a stalled native startup, preserving
SecureStore. Do not rely on remounting the provider as a retry.

**Why:** Expo Clerk holds its native client in a module-level singleton; remounting
the React provider can reuse the failed client instead of restarting startup.
Expo's public app reload works in release builds without requiring an OTA update.

**How to apply:** Warn that unsaved form contents are discarded, never save
credentials to survive a reload, and keep guest study available. Confirm the
installed binary's public hostname/build before treating workspace reachability
as evidence about TestFlight.

## Native OAuth callback configuration

Clerk's mobile SSO redirect allowlist must contain the exact app return URL for the SDK to include `rotating_token_nonce`. Social sign-in provider setup belongs under SSO connections; the separate OAuth applications page is not required for Apple or Google sign-in.

**Why:** An empty OAuth applications list led to confusion during social sign-in troubleshooting. These are different Clerk features, not interchangeable configuration steps.

**How to apply:** Verify Native API and the exact mobile redirect before diagnosing the returned URL. Never bypass nonce validation or ask the user to create an OAuth application for social SSO.

An exact callback match with no nonce does not by itself prove the redirect allowlist is wrong. Correlate it with the server-side provider event and the screen's account-creation intent.

**Why:** Apple returned an empty, correctly addressed callback while Clerk logged `external_account_not_found` on a sign-in attempt that the user started from Create account. Repeating redirect setup did not explain that distinction.

**How to apply:** Inspect which account flow was actually started and whether verification can transfer to the other flow. Do not assume choosing Create account in the UI changed the underlying OAuth request, or present an unverified native repair as confirmed by mocked tests.

## Identifying native failures

Do not infer the platform from a missing native build number, or assume every sign-in screenshot represents the same authentication method.

**Why:** A build-number fallback labelled a native failure as web, and an email/password alert was mistaken for the previously reported provider callback failure.

**How to apply:** Report the actual platform separately from build metadata. Match the current alert to its handler before requesting provider configuration changes; cover password submissions and session activation as well as OAuth returns with safe diagnostics.
