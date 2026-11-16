---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A text link: `Link` and the `.psi-link` class (D119).

- **`Link`**: the accent colour, underlined at rest, mixing toward ink and thickening its line on hover; `current` sets `aria-current="page"`, drawn as medium-weight text with no underline. With `href` it renders the anchor. A router app passes its own link as the only child instead, and `Link` adds the class and `aria-current` to it, as `NavItem` does. The font is inherited.
- **`.psi-link`** in `utilities.css` holds the rules, so any `<a>` — rendered markdown, a page without React — can take the class.
- **`--psi-link-*` tokens**: `fg`, `fg-hover`, `fg-current`, `font-weight-current`, `underline-thickness`, `underline-thickness-hover`, `underline-offset`, `focus-ring`, `radius`.
- **A new contrast pair**: the accent as text on `bgSecondary` (the Panel, Card, Dialog and Menu surface) is gated at 4.5. Every shipped theme already passes; a theme built with `psi-theme` is solved to pass.
