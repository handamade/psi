---
"@handamade/psi-tokens": minor
---

D46 token scopes: semantic tokens declare the CSS property groups they may bind (`scopes` on token sources); the token build gates every component-token binding (through `oklch(from var())` derivations) and throws on violations; scopes are emitted into `dist/resolved/<theme>.json`, DTCG `$extensions.psi`, and a generated `dist/scope-map.json` consumed by the new `psi/token-scopes` stylelint rule. New inversion tokens `bgInverted`/`fgOnInverted` (tooltip rebind, zero visual change). Implementation surfaced two additional tokens (`fillStaticWhite` for the switch thumb, caught by the build gate) and property-group vocabulary refinements plus a checkbox `currentColor` refactor (caught by the stylelint gate on first run).
