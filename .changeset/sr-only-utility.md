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
The shared recipe also adds `clip-path: inset(50%)` alongside the legacy
`clip: rect(0 0 0 0)`, a correctness fix none of the three private blocks
had. One behavioral consequence: this hiding now lives in
`utilities.css` rather than shipping inside `@handamade/psi-react/styles`,
so consumers who had been omitting `utilities.css` will see a raw
unstyled checkbox/switch input and a visible "Success:"/"Warning:"/"Error:"
prefix in toasts, instead of merely mis-themed content. `utilities.css`
is already documented as required (`NavBar` has depended on it the same
way), so the risk is low.
