# Drawer navigation

The refreshed drawer keeps the existing dark GospelAI identity and bundled logo/Bible artwork, with grouped navigation:

- **Your rhythm:** Today and Bible.
- **Study & reflect:** Christian insight, Saved verses and Notes.
- **Conversations:** labelled New chat action, local history search and conversation options.
- **More:** Support Us.

The footer retains guest sign-in/register links or the signed-in account/settings link. No account is required for study or local chat history. Nothing in the redesign adds cloud sync or changes storage.

The current page has a burgundy/gold highlight. Navigation respects existing route events (including the Bible listener), dismisses the keyboard and closes the drawer even when selecting the current page. The drawer scrolls on small screens and is capped at 420 pixels on tablets.

Conversation options remain available through long press or the ellipsis. Browser users receive accessible options and delete-confirmation modals; iOS retains its native action sheet. Options do not also open the conversation. Deletion requires explicit confirmation; cancellation retains its messages.

## Checks

`npm run test:drawer:browser` uses a fresh browser context and intercepted AI transport to create isolated test data. It verifies all drawer destinations, selected states, current-page dismissal, conversation search, rename persistence, cancel/confirm deletion, small-screen scrolling, tablet width and guest auth links. No existing user data or live AI calls are used.

The browser journey, targeted lint, study regressions, static export and project-wide TypeScript check pass. Signed-in account rendering and native iOS/Android drawer gestures/action sheets have not been device-tested.
