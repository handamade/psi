---
"@handamade/psi-tokens": minor
---

Add `@handamade/psi-tokens/generate` (D57): derive a brand from a text prompt
as an AA-solved light/dark pair, and serialize it as `customers/<name>.ts`
source. `parsePrompt` is deterministic — an FNV-1a hash seeds a PRNG, so an
unrecognised prompt still derives a coherent brand. `deriveTheme` returns both
members from one `BrandVector`, each solved to WCAG AA by binary-searching
lightness; it never returns a theme that renders below AA, because it throws
instead of returning one when the solver can't clear the matrix. The package
now compiles `src/generate` to `dist/generate` via `tsc`.

"Clears the AA matrix" means the same **33** pairs `scripts/build.ts` gates
every committed theme on — `wcagAAPairs` plus `componentLabelPairs` — not the
28-pair subset. `buildBrandPalette` darkens the accent anchor only as far as a
white `fgOnAccent` label needs to clear `fillAccent` with margin, so that pair
passes by construction rather than by escalation; at a flat `l: 0.55` the worst
hue (146, `vivid`) rendered it at 4.4979:1. The serialized `customers/<name>.ts`
also carries the vector's `fonts`, and its solved overrides no longer narrow
`fgDanger`'s scopes — either omission made the emitted file wrong, and the
second made it unbuildable.
