---
name: Expo SQLite provider child updates
description: Why route subscriptions must live inside SQLiteProvider when nested database contexts are used.
---
Subscribe to changing route/context values inside a stable SQLiteProvider, rather than passing them only through its children from outside.

**Why:** Expo SDK 54's SQLiteProvider uses a custom memo comparator that ignores `children`. Query parameters can update the browser URL while the old child props remain visible; ordinary React prop-update expectations do not hold across this boundary.

**How to apply:** Put route parameter hooks in a child under the provider, allowing React context propagation to reach the subscriber. Do not use a changing provider key or initialization callback to force updates: that reopens the database and can interrupt downloads.
