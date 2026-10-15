---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A checkbox and radio you can find (D106).

- **New semantic border `--psi-border-control`** — `fgPrimary` at alpha 0.55 in light-based themes and 0.40 in dark-based ones — for a control identified by its outline alone. The unchecked `Checkbox` box and `Radio` circle bind it. They bound `--psi-border-neutral`, which measured 1.32–1.48:1, and now clear WCAG 1.4.11's 3:1 in every theme (3.24:1 at worst).
- **The contrast gate has its first non-text pairs**, `nonTextPairs`: `borderControl` on `bgPrimary` and `bgSecondary` at 3:1. `buildThemeCss` and `deriveTheme` apply them too, so a consumer theme whose `fgPrimary` barely clears 4.5:1 could now fail; the error names the pair. Every theme `deriveTheme` can produce passes (3.22:1 at worst).
- Input, Select and Textarea borders are unchanged.
