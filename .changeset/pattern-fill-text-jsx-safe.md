---
"@handamade/psi-react": patch
---

Patterns: fill placeholders now use `[square brackets]`, and the D48 validator
rejects fill text that isn't JSX-safe (error class 9). The old angle-bracket
convention (`"confirm-label": "<verb the object>"`) rendered into preset text
children as `<Button ...><verb the object></Button>`, which a JSX parser reads
as an unclosed `<verb>` element — all three seed presets in `dist/patterns.json`
shipped unparseable. `content` values and literal slot text fills may no longer
contain `<` or `{`; a new test parses every emitted preset with the TypeScript
JSX parser so a preset can never again validate while failing to compile.
