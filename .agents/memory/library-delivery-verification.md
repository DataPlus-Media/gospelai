---
name: Library delivery verification
description: Separate storage integrity from production transport and native download verification.
---

Treat private-object integrity, local endpoint checks, and published native downloads as separate release checks.

**Why:** An intact full-Bible package and passing local endpoint tests coexisted with empty HTML 500 responses for a large production download, while a smaller work and access-denial routes succeeded. Startup health-check logs alone did not identify that failure. No exact hosting response-size limit was established.

**How to apply:** Check an actual large work through the published endpoint and the existing native client before declaring delivery fixed. Compare decoded content against the manifest, distinguish wire size from decoded size, and retain server-side access checks. Do not assume a new EAS build fixes a backend-only delivery failure.
