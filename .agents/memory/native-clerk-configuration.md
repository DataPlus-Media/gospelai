---
name: Native Clerk configuration
description: Keep the native app's external Clerk configuration separate from Replit-managed auth detection.
---
GospelAI's native EAS builds use the user's existing external Clerk account. Do not provision a new Replit-managed Clerk tenant as a fix for native sign-in errors.

**Why:** EAS receives configuration independently of the Replit workspace. A workspace management check reporting `not_configured` does not establish that a TestFlight build is missing its publishable key.

**How to apply:** Diagnose native sign-in against the build's existing external instance, registered app scheme, and returned authentication state. Never infer the native production configuration from workspace secrets alone.
