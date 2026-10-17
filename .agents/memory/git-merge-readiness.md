---
name: Git merge readiness
description: Avoid repeated remote-pull conflicts caused by an unfinished local merge.
---
Do not report a pull as complete merely because conflict markers are gone or a checkpoint has a clean working tree.

**Why:** Pending merge state and staged resolutions were reset between turns in this workspace, while the remote commit remained outside local history. The user's next pull therefore recreated the same conflicts.

**How to apply:** Check incoming-branch ancestry as well as unmerged index entries. When authorized to finish a pull, create the local merge commit and verify that the incoming commit is an ancestor of HEAD. Explain that this is local only and does not push to GitHub. If the user wants to commit themselves, clearly say the merge is unfinished rather than reporting the pull as complete.
