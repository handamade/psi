---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

An icon and a count in the navigation tree, and a new `Count` component (D124).

- **`Count`**: a number after a label, such as *Cards 238*. Tabular numerals, quiet by default, capped at `max` (*999+*). `tone="attention"` is a pill in the warning tint and medium weight, so colour is never the only signal. `label` gives a screen reader words in place of the number (*4 stuck*). It is never a live region.
- **`NavItem` `icon` and `count`**, and **`NavGroup` `icon`**: a decorative icon before the text, sized by `--psi-nav-tree-icon-size` and coloured with the text in every state, and a count at the end of the row. Both go inside the link: with a router link, `NavItem` clones it to hold them. Without them, nothing changes.
- **Tokens**: `--psi-count-*`, `--psi-nav-tree-icon-size`, `--psi-nav-tree-icon-gap`.
- **Manifest**: `NavItem` and `NavGroup` list their slots (`icon`, `count`, `label`, `body`).
