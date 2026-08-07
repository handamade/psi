---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

DescriptionList, IconMoreHorizontal, and patterns that can render themselves (D70–D71)

The 2026-08-07 generation eval returned two improvisations, and both were the
same defect: **a shipped pattern whose required parts did not all exist.**
`row-actions` specified an icon trigger the 25-icon set had no glyph for;
`detail-drawer`'s entire body was the sentence "[key-value summary of the
selected record]". Both declared `gaps: []` truthfully, because `gaps` only
covers components named in `compose` — and what was missing was named in
`content`, as prose, where nothing looked.

**New — `DescriptionList` + `DescriptionItem`:** a `<dl>` of term/value pairs.

```tsx
<DescriptionList layout="inline">
  <DescriptionItem term="Date">7 Aug 2026</DescriptionItem>
  <DescriptionItem term="Amount">$1,240.00</DescriptionItem>
</DescriptionList>
```

`stacked` (default) puts the term above its value; `inline` is a two-column
grid, which is what a drawer wants. The term is a prop and the value is
children, matching `Field`'s `label` idiom. Each item renders
`<div><dt/><dd/></div>` — the HTML5 grouping element — so the native
term/value association assistive tech relies on stays intact.

**New — `IconMoreHorizontal`**, the ellipsis glyph `row-actions` always asked
for.

**Patterns can now declare the affordances their content depends on**, via an
optional `requires` array resolved against the manifest (`kind: "component"`)
or the icon roster (`kind: "icon"`). An unresolved entry becomes a gap, which
blocks the pattern through the machinery that already existed — now fed from
content as well as from the compose tree. `row-actions`' preset emits
`<IconMoreHorizontal />` instead of `[icon]`, and `detail-drawer`'s emits a
real `DescriptionList` instead of a sentence. Both presets are now code you
can paste.

This does not make the bug impossible — nothing can stop an author from
writing a placeholder and declaring nothing — so the build also prints every
bracketed content placeholder (19 today, 17 of them legitimately consumer
copy), making a new silent one visible rather than invisible.

Also fixed: `packages/react/README.md` omitted `utilities.css`, listing four
stylesheets where there are five, and `guidance.rules` now states when a
control takes a `Field` and when it does not — `filter-toolbar` and
`table-pagination` previously contradicted each other.
