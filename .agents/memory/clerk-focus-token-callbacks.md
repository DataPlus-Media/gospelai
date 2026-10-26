---
name: Clerk token callbacks in focus hooks
description: Avoid callback identity churn when a route focus loader reads a Clerk session token.
---

When a route focus loader calls Clerk's `getToken`, keep the latest callback in a ref and keep the loader stable across renders; clear account-sensitive cached data only when the signed-in state changes.

**Why:** Saved note controls repeatedly detached during browser interaction when the token callback was a direct focus-loader dependency. A stable loader stopped the repeated refresh and allowed note editing and deletion to complete.

**How to apply:** For `useFocusEffect` or polling hooks that fetch account-scoped data, use a current token-provider ref and depend on the database and auth mode rather than the callback identity.
