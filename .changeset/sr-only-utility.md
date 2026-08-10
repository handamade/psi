---
"@handamade/psi-tokens": minor
"@handamade/psi-mcp": minor
"@handamade/psi-react": patch
---

`.psi-sr-only`, a public visually-hidden utility.

Psi had no public way to hide content visually while keeping it in the
accessibility tree — the technique existed only as private, byte-identical
CSS duplicated across Toast, Checkbox and Switch, and nothing in `llms.txt`
documented the convention. `.psi-sr-only` ships from `utilities.css`,
generated the same way every other hand-written utility family is (D79), so
it appears in `guidance.json` → `utilities.classes` automatically.

Toast, Checkbox and Switch now consume it instead of their own private
copies — internal cleanup only, no prop, behavior, or ARIA change (D80).
