---
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
"@handamade/psi-mcp": minor
---

Components promote essential native props into the manifest, and the ledger catalog grows from 4 patterns to 13 (D59–D60)

`IconButton` now declares `aria-label` as a **required** prop. It was always
accepted — inherited from `ButtonHTMLAttributes` — but the manifest's prop
filter dropped it, so an agent reading `manifest.json` had no discoverable
way to name an icon-only control. This is a type-level breaking change:
TypeScript consumers omitting `aria-label` will now see an error, which is
the point — the previous state shipped unnameable buttons silently.

`Input` now declares `type` as a curated union (`text | search | email | tel
| url | password | number | date`), deliberately narrower than the native
attribute: checkbox, radio, file and submit are separate Psi controls, so
those values were never meaningful here. This is also a type-level breaking
change: TypeScript consumers currently passing `type="checkbox"`, `type="radio"`,
`type="file"`, or `type="submit"` to `Input` will now see a new TypeScript
error.

Nine new ledger patterns are authored, taking the catalog from 4 to 13.
`dist/patterns.json` now carries a machine-readable component backlog for
the first time, naming five gaps: `Table`, `Pagination`, `Drawer`, `Toast`,
`Tabs`. `row-actions` switches to the icon-only kebab trigger it always
wanted. Three patterns — `bulk-action-bar`, `empty-state`, `summary-tiles`
— were checked against the shipped component set and confirmed to need
nothing new.

Also fixed: growing the catalog to 13 patterns pushed the MCP search
overview past its 6000-character response budget, which was silently
squeezing components out of the empty-query overview (down to 3). Pattern
summaries are now capped at 120 characters in the overview projection only
— the stored summaries used for search ranking are untouched. The overview
now surfaces all 13 topics, all 13 patterns, and all 6 components.
