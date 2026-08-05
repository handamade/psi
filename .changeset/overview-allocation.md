---
"@handamade/psi-tokens": patch
"@handamade/psi-react": patch
"@handamade/psi-mcp": patch
---

The search overview allocates its response budget by kind (D61).

`search("")` used to fill topics, then patterns, then components until the
6000-character budget ran out, so whichever kind came last absorbed all
catalog growth — three more patterns was enough to starve components from six
down to four. It now reserves a floor of eight components and derives the
per-pattern summary cap from what remains, so a growing catalog shortens
summaries instead of dropping items. The `blocked (gaps: …)` suffix is never
trimmed, so the component backlog survives at any catalog size.

No API change; keyword search results and ranking are unaffected.
