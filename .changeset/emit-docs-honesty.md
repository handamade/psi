---
"@handamade/psi-react": patch
"@handamade/psi-mcp": patch
---

Generated docs stop fabricating API surface (HAN-41): the Theming section now claims `--psi-<component>-*` overrides only when the token family exists, and derived hover/active states only when the family has `-hover` tokens — Toolbar's docs state it has no component tokens instead of inventing them. Tag now lists `children` in the manifest like the other content-bearing leaves.
