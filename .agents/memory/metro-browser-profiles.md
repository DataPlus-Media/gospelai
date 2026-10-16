---
name: Metro and browser profiles
description: Why runtime browser profile directories must stay outside Metro's watch set.
---
Exclude runtime browser profile and workspace log/cache directories from Metro's watch set.

**Why:** In this workspace Chromium writes beneath `.config` and workflow logs rotate beneath `.local`, inside the project. Temporary directories disappear during normal activity; Metro's filesystem watcher can crash with an ENOENT while traversing them.

**How to apply:** Preserve the runtime-directory exclusions when changing Metro configuration. Generated build/test output also belongs outside the source watch set.
