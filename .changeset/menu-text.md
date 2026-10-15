---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

A menu holds a line of text that is not an action (D99), and a new `account-menu` pattern demands it.

- **New component `MenuText`**: a line such as a build identifier, inside the `role="menu"` element with no role of its own. It is in the accessibility tree as a child of the menu, never focused, never a `menuitem`, and the arrows, Home, End and typeahead skip it. It is never `aria-hidden`.
- **`Menu` declares `aria-describedby`.** Give a `MenuText` an `id` and pass that id to make the line the menu's description, which some screen readers speak when the menu opens. It is off by default.
- **New token `--psi-menu-text-fg`** = `--psi-fg-secondary`, already gated at 4.5:1 on the menu surface.
- **New pattern `account-menu`**: a ghost trigger with the user's name, account actions, *Sign out*, and a `MenuText` line last. 47 components, 23 patterns.
- In a menu's focus mode, a screen reader reaches the line by browse mode or the VoiceOver cursor. Placement was measured with axe and Chromium's accessibility tree, not with a screen reader; check it with yours.
