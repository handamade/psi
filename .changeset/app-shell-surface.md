---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A frame with a rounded surface, with no CSS of your own (D110).

- **Three new `AppShell` tokens.** `--psi-app-shell-bg` paints the shell's root, `--psi-app-shell-main-bg` paints `<main>`, and `--psi-app-shell-main-radius` rounds `<main>`'s top-start corner. They paint nothing by default, so a shell that sets none looks as it did. `--psi-app-shell-bg` shows only behind the corner and must equal the canvas of the theme on the header and the sidebar. No `var()` reaches a sub-theme from the page's scope, so write the value, in a theme's `componentOverrides` or on the root.
- **The corner is square unless a header and a sidebar both meet `<main>`.** With the sidebar closed it would be a notch against the viewport's edge. `<main>` takes a class of its own in that case; nothing else changes.
- **New `--psi-navbar-border-width`**, default `1px`. `0` removes the line and its pixel, so a `--psi-navbar-height` of 56px gives a bar of 56px. A transparent `--psi-navbar-border` hid the line and kept the pixel.
- The `Frame` story shows the design: one dark theme over the header and the sidebar, with `data-psi-theme` on the `NavBar`. The skip link's inset ring follows the corner.
