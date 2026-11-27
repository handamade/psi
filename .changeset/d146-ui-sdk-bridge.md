---
"@handamade/psi-tokens": minor
---

D146: `@handamade/psi-tokens/ui-sdk.css` themes UI SDK's default look (`@ui-sdk/core/web.css`) with Psi tokens, and `ui-sdk.json` lists its map. It is optional: import it after `web.css`, behind `@layer ui-sdk, psi.base, psi.theme, psi.components, psi.utilities, psi.ui-sdk;`. The contrast gate now also checks `borderFocus` at 3:1 on `bgPrimary` and `bgSecondary`. Every Psi theme passes, but a consumer theme built with `@handamade/psi-tokens/theme` whose focus colour is under 3:1 on either surface now fails its build.
