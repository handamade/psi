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
