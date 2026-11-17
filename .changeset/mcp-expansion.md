---
"@handamade/psi-mcp": minor
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
---

The MCP answers with the docs (D129). `get` now returns each docs page's own markdown, the same text as psi.kurkin.de/docs/…/<page>.md, examples included, **instead of JSON**: anything that parsed `get`'s JSON must read markdown instead. Two new tools: `theme` derives a light and dark theme, solved to WCAG AA, from one colour or a hue, and `check` reports JSX that uses Psi's API wrongly (unknown exports, props and values, missing required props, slot contracts, missing accessible names). None of the four tools writes files or calls a model. `manifest.json` gains `attributes`, `accessibleName` and `contracts`, with the pass-through attribute names in `dist/attributes.json`; `@handamade/psi-tokens/generate` exports `parseColor`, `contrastReport` and `ACCENT_CHROMA`. In `@handamade/psi-mcp`, the `Detail` type export is removed, and `buildIndex` now returns `BaseIndex`, the index without its baked `docs`.
