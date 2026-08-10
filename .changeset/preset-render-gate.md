---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": patch
---

Toolbar's direct form controls stop stacking, and every composition
pattern now has a real, mounted Storybook story.

`filter-toolbar` composes a bare `Input`/`Select` directly under `Toolbar`
— the pattern most likely to be copy-pasted verbatim, and the one that
rendered wrong: `Toolbar`'s flex-wrap row had no constraint on its
children, and `Input`/`Select`'s own `width: 100%` became their flex-basis
as direct flex children, so each control claimed the full row and the
toolbar stacked vertically instead of reading as one. `Field`-wrapped
usage (as `apps/ledger`'s filter row already does) was never affected.

`Toolbar` gains `--psi-toolbar-control-width` (200px default) and a
scoped rule giving its own direct, unwrapped `input`/`select` children a
deliberate width, matching the effect existing hand-written `Toolbar`
stories already worked around one-off with inline styles.

Separately: every pattern in `patterns.json` (13 today) now renders as a
real, registered React element tree in its own generated Storybook story
with a VR baseline — `renderPresetElement`, a sibling to the existing
`renderPreset` JSX-string emitter, so a pattern's documented composition
and its rendered layout can no longer silently drift apart, and a future
pattern gets a story automatically rather than needing one hand-written.
