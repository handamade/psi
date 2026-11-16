---
"@handamade/psi-tokens": minor
"@handamade/psi-react": patch
---

Every theme declares its `color-scheme` (D116).

- **Dark themes now draw the browser's own parts dark.** A theme's CSS declares `color-scheme: light` or `color-scheme: dark` from its base, so a date field's picker icon, a native select's list, spin buttons and scrollbars match the theme. Before, they were drawn for a light page on every theme, which put a near-black calendar icon on a dark date field. **What can change for you:** on a dark theme those parts render dark, and the browser's system colours flip too (for example `LinkText` on unstyled links, `Field` and `ButtonFace` on unstyled native controls), not only pickers and scrollbars. On a light theme nothing changes, unless your page lets the OS choose (`<meta name="color-scheme" content="light dark">`, or your own `color-scheme: light dark` in a layer): the light theme's `:root` now pins `light`. To restore the choice, set `color-scheme` in an unlayered rule. An unlayered `color-scheme` rule of your own, one in a layer declared after `psi.theme`, or an inline style overrides it; one in `@layer psi.base` does not.
- **Sub-trees follow.** A `data-psi-theme="dark"` element inside a light page, such as `AppShell`'s `sidebarTheme="dark"`, takes the dark scheme with its tokens.
- **Your own themes too.** `buildThemeCss` and `psi-theme` declare the scheme from the definition's `base`, `light` when none is named; rebuild to pick it up.
- **`resolved/<theme>.json` gains `colorScheme`**, `"light"` or `"dark"`.
- The rule stands: a theme still paints no background.
