---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A page heading in the brand's display face: `PageHeading` (D118).

- **`PageHeading`**: the page's one `h1`, at 24/32 medium in `--psi-font-display`, with margin 0. Use one per screen, as the first thing in the page. Inside an `AppShell`, it goes after any `banner`, and margin 0 keeps the page one block padding below the header and below a banner alike. It has no `as`, `size` or face prop. Restyle it through `--psi-page-heading-font` and `--psi-page-heading-fg`.
- **A new text style, `--psi-text-display-24-32-medium`**, with its utility `.psi-text-display-24-32-medium`: 24/32 medium in the display face. Unlike the fluid `--psi-display-*` tier, it has fixed px, no tracking and no uppercase.
- **The `app-shell` preset** now opens its page with a `PageHeading`.
- `guidance.json`'s `typographyDefaults` gains `pageHeading`. `heading` is unchanged.
- `Text` is unchanged. It still stops at `h4`.
