---
"@handamade/psi-react": patch
---

Checkbox checkmark glyph now binds its ink via `color` + `border: solid currentColor` instead of a direct token binding on `border` — semantically honest under D46 scopes, byte-identical rendering.
