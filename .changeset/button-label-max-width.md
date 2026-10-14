---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A cap on the width of a button's label (D98). Off by default; no rendering changes unless you set it.

- **New token `--psi-button-label-max-width`**, default `none`. Set it on your own class, and a label wrapped in a direct `<span>` stops at that width and ends in an ellipsis: `<Button className="account"><IconUser aria-hidden="true" /><span>{name}</span></Button>` with `.account { --psi-button-label-max-width: 12rem; }`.
- A bare text label is not capped. Wrap it in a `<span>`, as a trailing icon already requires.
- The full text stays the button's accessible name. Psi adds no `title`; whether a truncated label needs a visible full form is your design.
- A direct `<span>` in a `Button` now has `overflow: hidden` and `flex: none`. With the cap off, it renders as before.
