---
"@handamade/psi-tokens": patch
"@handamade/psi-react": patch
"@handamade/psi-mcp": patch
---

The manifest now describes `children`, and patterns can set `aria-*` (D72–D73)

`dist/manifest.json` listed `children` for 12 of 34 components while 31 accept
it, so an agent cross-checking its output strictly against the manifest — which
is exactly what the generation eval asks for — would flag correct code as an
invented prop. Three consecutive eval runs reported it.

The cause was not the prop filter, which is what the previous cycle recorded.
Measured against the real parser: **`react-docgen-typescript` reports
`children` only when the declaration carries a JSDoc comment.** Whether the
interface extends an `HTMLAttributes` type, and whether the type is written
`ReactNode` or `React.ReactNode`, make no difference — all four combinations
drop it, and adding a comment to any of them restores it. The twelve that
worked were simply the twelve that documented it.

So `children` is now documented on all 31 components that take it. `Input`,
`Pagination` and `MenuSeparator` still omit it, and should: publishing a prop
that does not apply is worse than omitting one that does.

**Patterns can also set `aria-*` props on any component.** Previously the
pattern validator rejected `aria-label` on `Input` because the manifest had no
such prop, which left the shipped `filter-toolbar` pattern with a `Select` that
had no accessible name. Every component spreads its rest props onto a DOM
element, so every `aria-*` attribute is valid on every one of them — the
manifest's silence was never a claim otherwise. `filter-toolbar` now names both
of its controls.

No runtime change: the component declarations are documented re-statements of
members the prop types already had.
