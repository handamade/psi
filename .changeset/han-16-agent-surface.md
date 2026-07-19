---
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
"@handamade/psi-mcp": minor
---

Agent-surface gap fixes from the HAN-8/HAN-17 verification sessions (HAN-16):

- **psi-react**: every component now carries a one-line description (TSDoc →
  manifest.json → MCP briefs); NavBar styles raw anchors in its brand/nav-link
  slots (previously browser-default blue); `"./styles.css"` exports alias so
  TypeScript can type the side-effect import without `declare module`.
- **psi-tokens**: NavBar gains `link-fg`, `link-fg-hover`, `focus-ring`
  component tokens.
- **psi-mcp**: `getting-started` (topic + init-generated AGENTS.md) now lists
  the required `@handamade/psi-react/styles` import — omitting it renders
  every component unstyled; new `topic:themes` (theme list, data-psi-theme
  mechanics, customer themes) and `topic:scales` (space/size/radius/motion/
  layout values), both searchable — `search "space"` no longer returns empty.
