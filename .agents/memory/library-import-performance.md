---
name: Large offline-library imports
description: Preserve atomic installation while avoiding per-row SQLite bridge overhead.
---

Keep large offline-library installs atomic, with bounded batches of parameterized SQLite writes.

**Why:** Writing every section and paragraph through a separate asynchronous call made a full-Bible edition take minutes to install in the browser worker. Increasing timeouts alone does not address that cost.

**How to apply:** Keep batches below conservative SQLite bind limits, preserve progress updates, and retain rollback/retry checks. Do not trade transaction safety for installation speed.
