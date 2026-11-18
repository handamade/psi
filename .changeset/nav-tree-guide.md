---
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
---

`NavTree` can draw a guide line and colour its icons apart from their text, through tokens alone (D138).

- **A guide line down an open group's entries.** `--psi-nav-tree-guide-width` (default `0px`, so nothing is drawn) and `--psi-nav-tree-guide-border` (default `--psi-border-strong`) draw a line centred under the group's icon. Psi places it from the group's own geometry (19px from the group's start at the default 16px icon and a 1px line), so you set no column. Only a group with an icon draws it, and it mirrors in RTL. Write the width with a unit.
- **The current entry's bar becomes a segment of that line.** The bar is now `--psi-nav-tree-indicator-width` (`3px`), `--psi-nav-tree-indicator-inset-block` (`0`) and `--psi-nav-tree-indicator-radius` (the tree's radius). While a group draws its guide line, the current entry's bar in that group moves onto it.
- **Icon colours of their own.** `--psi-nav-tree-item-icon-fg` and `--psi-nav-tree-group-icon-fg` colour an entry's and a group's icon (default `currentColor`, the text's). The current entry's icon follows its text.
- **What changes for you:** nothing until you set them. Every default draws today's pixels. A sidebar that reached into the tree's markup with CSS for this look can drop that CSS and set these tokens in its theme's `componentOverrides` instead.
