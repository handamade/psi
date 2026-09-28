---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

Portal readiness (D81): Psi can now be the component basis of an application
with a strict content security policy and a single live-region announcer, and
can theme a brand it does not ship.

- **`Field` gains `announce`** (default `true`). With `announce={false}` the
  message line is no longer a live region, for an application that routes every
  announcement through one announcer of its own. `aria-describedby` still links
  the message to the control.
- **`Select`'s chevron is drawn with CSS gradients instead of a `data:` SVG**,
  so it renders under `default-src 'self'`. It now follows the theme through
  `--psi-select-chevron-fg` rather than a hard-coded `#666`. A new stylelint rule
  forbids `url()` in component CSS.
- **Four icons:** `IconMenu`, `IconChevronLeft`, `IconLogOut` and `IconSimCard`,
  making 30.
- **`@handamade/psi-tokens/theme`:** `buildThemeCss(name, definition)` builds a
  theme from a definition kept in the consumer's own repository, through the
  same WCAG AA contrast and D46 scope gates as Psi's shipped themes. The two
  builds run the same code, and a failing theme throws `ThemeGateError`. The
  `psi-theme` bin does the same from a build script. The token builders and
  definition types are re-exported for writing overrides.
- The D46 `text` scope group now admits `background-image`, so a glyph drawn
  with gradients can bind an `-fg` token.
