---
"@handamade/psi-react": patch
---

NavBar: fix missing gutter padding and typeface (HAN-40). The inner layout div
still used the pre-D42 `ds-container` class — renamed to `psi-container` so the
gutter padding and max-width centering apply again. NavBar now also sets
`font: var(--psi-text-14-20-medium)` like every other text-bearing component
instead of inheriting the page font (UA serif on hosts that don't set one).
