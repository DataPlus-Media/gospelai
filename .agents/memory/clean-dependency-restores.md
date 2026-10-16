---
name: Clean dependency restores
description: Dependency reproducibility constraints for Expo setup after merges.
---

Configuration must use public Expo entry points and explicitly declare any Babel presets it references; do not depend on incidental dependency hoisting.

**Why:** A clean dependency restore exposed configuration imports that worked only with the previous node_modules layout. Successful installation alone did not establish that Metro could bundle the app.

**How to apply:** After dependency changes, verify a clean locked install and an actual served bundle. Preserve the current Expo SDK major when resolving blocked dependencies; do not bypass the package firewall.
