---
"@handamade/psi-mcp": minor
---

The search overview has room for more patterns (D100). In `search("")`, a pattern row is now `{id, kind, summary}`: it no longer carries `title`, which only repeated the id after `pattern:`.

- At 23 patterns the overview had already cut every pattern summary to `"…"`, and the next pattern would have pushed a component out. With the repeated title gone, the overview keeps every topic, every pattern and at least 8 components through 32 patterns, and the pattern summaries get their first words back.
- Keyword search is unchanged: `search("delete confirmation")` still returns `{id, kind, title, summary}`, and ranking still reads the full stored briefs.
- Read a pattern's name from `id` in an overview row. TypeScript: `Store.search()` now returns `SearchBrief[]`; `SearchBrief` and `OverviewPatternBrief` are exported beside `Brief`.
