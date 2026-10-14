---
"@handamade/psi-react": minor
---

The navigation tree marks the entry the current screen sits under (D96). No prop changes.

- **A link in a `NavTree` with `aria-current="true"` now shows as current**: the current foreground colour and medium weight. Before, it looked like any other link, so a screen that sits under an entry, and is not in the tree itself, left no current mark anywhere.
- **The raised surface and the inline-start bar stay the marks of `aria-current="page"`**, the screen itself, so a parent and its leaf are still distinct when both are visible.
- `NavItem` still sets only `page`. To mark a parent, set `aria-current="true"` on the link you pass as its child. Links with no `aria-current`, or with `page`, render as before.
