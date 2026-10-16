---
name: Welcome motion verification
description: Non-obvious accessibility and browser-test constraints for the Expo welcome experience.
---
Test reduced motion enabled before a cold launch, not only after the app has loaded.

**Why:** Animation-library imports can fail before welcome hooks run; a live preference-change test alone missed that startup path.

**How to apply:** Include both initial browser/device preferences and runtime changes when checking motion accessibility. A dependency patch affecting native code requires a rebuilt native binary; successful JavaScript bundles do not prove the installed app works.

Wait for the interactive Expo client tree before resizing or scrolling in browser tests.

**Why:** The server-rendered shell can contain apparently visible controls that are replaced during client initialization, producing detached-element failures unrelated to the action being tested.

**How to apply:** Use a client-readiness signal rather than the presence of server-rendered text. Keep live browser checks separate from exports or source edits that can trigger refreshes.
