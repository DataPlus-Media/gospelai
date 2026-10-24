---
name: Native Clerk configuration
description: Keep the native app's external Clerk configuration separate from Replit-managed auth detection.
---
GospelAI's native EAS builds use the user's existing external Clerk account. Do not provision a new Replit-managed Clerk tenant as a fix for native sign-in errors.

**Why:** EAS receives configuration independently of the Replit workspace. A workspace management check reporting `not_configured` does not establish that a TestFlight build is missing its publishable key.

**How to apply:** Diagnose native sign-in against the build's existing external instance, registered app scheme, and returned authentication state. Never infer the native production configuration from workspace secrets alone.

## Native network failures

Keep Clerk's `rethrowOfflineNetworkErrors` enabled and treat an empty authentication status as a service failure, not as evidence that provider credentials or verification methods are missing.

**Why:** The installed Clerk SDK can swallow native fetch failures and return an unchanged, empty resource. This made email sign-up and both social providers report misleading continuation errors when the public sign-in hostname could not resolve.

**How to apply:** Check public DNS/reachability before sending the user through repeated OAuth credential setup. Mocked successful resource shapes alone do not verify native service connectivity.
