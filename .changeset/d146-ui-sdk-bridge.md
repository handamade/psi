---
"@handamade/psi-tokens": minor
---

D146: `@handamade/psi-tokens/ui-sdk.css` themes UI SDK's default look (`@ui-sdk/core/web.css`) with Psi tokens, and `ui-sdk.json` lists its map. It is optional: import it after `web.css`, behind `@layer ui-sdk, psi.ui-sdk, psi.base, psi.theme, psi.components, psi.utilities;`. The contrast gate now also checks `borderFocus` at 3:1 on `bgPrimary` and `bgSecondary`. Every Psi theme passes, but a consumer theme built with `@handamade/psi-tokens/theme` whose focus colour is under 3:1 on either surface now fails its build. `@handamade/psi-mcp` indexes the new UI SDK guide as `guide:ui-sdk`, so `get` and `search` return it, and `contrastReport()` and `deriveTheme` from `@handamade/psi-tokens/generate` now check and report 49 pairs, not 47.
