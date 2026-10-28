---
name: Notes storage verification
description: Why passing mocked notes tests is insufficient evidence of deployed sync readiness.
---
Treat notes API permission tests and actual storage readiness as separate checks.
Do not infer that signed-in notes work from a successful publish, a configured
Clerk key, or passing mocked database tests.

**Why:** The notes API passed mocked CRUD tests while the required development
table and managed production database had not been provisioned. Correcting Clerk
configuration exposed a second, independent database failure.

**How to apply:** Verify CRUD against a real development schema, confirm the
production database exists, and distinguish those checks from a signed-in
production round trip. If production access is unavailable, state that limit
instead of claiming live sync works.
