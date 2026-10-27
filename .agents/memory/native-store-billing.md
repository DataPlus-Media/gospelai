---
name: Native store billing
description: GospelAI's provider choice for native support subscriptions.
---

Use direct Apple in-app purchases on iOS and Google Play billing on Android for GospelAI support subscriptions; do not use RevenueCat unless the user changes this decision.

**Why:** the user clarified that this app uses Apple's in-app purchases rather than RevenueCat.

**How to apply:** Build native support purchase flows with the existing store billing integration, and keep support subscriptions separate from study-feature access.
