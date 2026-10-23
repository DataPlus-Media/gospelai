---
name: Native and web accessibility differences
description: React Native Web accessibility behavior that is easy to miss when checking native drawer controls.
---
Check web accessibility separately from native accessibility. In the project's React Native Web version, native `accessibilityState` did not expose the selected navigation state to the browser. Icon glyphs also contributed to accessible button names when labels were inferred from text.

**Why:** The drawer looked correctly selected but browser checks could not identify the current page; a text-and-arrow auth button also had a different accessible name from its visible text.

**How to apply:** Retain native selected states, expose the current navigation page with web `aria-current`, and give text-plus-icon actions explicit accessible labels. Verify actual rendered semantics rather than assuming native props map identically to the web.

For Expo Router `Link asChild` controls on React Native Web, pass a flattened
style object to the child instead of a raw style array; the link wrapper can
forward the array to the DOM `style` property and crash rendering.

**Why:** A guest Settings preview failed in the browser with a
`CSSStyleDeclaration` indexed-property error after styling the nested email
links.

**How to apply:** When a nested route link fails only on web, inspect the
rendered DOM style props and flatten the child style before changing navigation
or link behavior.
