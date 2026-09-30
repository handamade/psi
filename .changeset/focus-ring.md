---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

One focus ring (D82): the ring's geometry is now three scale tokens, and
every focusable part Psi renders binds them on `:focus-visible`.

- **psi-tokens**: `--psi-focus-ring-width` (2px), `--psi-focus-ring-offset`
  (2px, a ring outside the control) and `--psi-focus-ring-offset-inset`
  (-2px, a ring inside it). Also in `resolved/<theme>.json`
  (`scales.focusRing`) and the DTCG export (`dimension.focusRing`). Menu and
  Dialog gain `--psi-menu-focus-ring` and `--psi-dialog-focus-ring`.
- **psi-react**: every component's focus rule binds the tokens instead of a
  literal `2px`. Menu items, the `<dialog>` and a drawer's scrolling panel
  draw the Psi ring where the browser's own showed before. `Input` and
  `Select` key the ring on `:focus-visible`.
- **One visible change**: the ring on `Input` and `Select` sits one pixel
  further in (offset `-1px` → `-2px`), wholly inside the control's box.
