---
name: Offline library cleanup timing
description: Browser-test timing for removing large downloaded commentary from the local SQLite library.
---

When a browser test removes a large offline commentary, do not assume the removal is stuck just because it has not finished within 20 seconds.

**Why:** Removing a large downloaded work consistently exceeded a short browser-test wait but completed when the check allowed more time.

**How to apply:** Use a longer wait for the completed removal state in large-package tests; distinguish a still-running operation from a failure before changing app behavior.
