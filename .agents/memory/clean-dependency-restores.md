---
name: Clean dependency restores
description: Dependency reproducibility constraints for Expo setup after merges.
---

Configuration must use public Expo entry points and explicitly declare any Babel presets it references; do not depend on incidental dependency hoisting.

**Why:** A clean dependency restore exposed configuration imports that worked only with the previous node_modules layout. Successful installation alone did not establish that Metro could bundle the app.

**How to apply:** After dependency changes, verify a clean locked install and an actual served bundle. Preserve the current Expo SDK major when resolving blocked dependencies; do not bypass the package firewall.

Cached dependency directories can also hide old transitive versions now blocked by the package firewall.

**Why:** Merge-time dependency setup exposed blocked packages even after functional checks had passed against a pre-existing installation.

**How to apply:** Use supported package installation tools and patched releases, not a firewall bypass. Restart Metro after dependency work; avoid deleting its dependency tree while expecting its watcher to remain healthy.

The user releases the app through GitHub to the App Store; builds must not depend on a Replit-only package download host.

**Why:** The user described this release workflow. A lockfile regenerated inside Replit can record internal registry addresses that are unreachable from external build workers.

**How to apply:** Keep exact versions and integrity hashes portable across registries. Preserve each environment's security policy, and distinguish local CI-style install checks from a real external release build. Replit configuration does not automatically reach the native build service.
