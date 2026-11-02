---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

`NavBar` sets its own text colour, so plain text in a themed header can be read (D111).

- **New `--psi-navbar-fg`**, default `var(--psi-fg-primary)`, and `.navbar` paints it. Text in the bar used to inherit the page's colour as a resolved value, so under `data-psi-theme` on the `NavBar` it kept the page's: dark text on a dark bar, 1.11:1 where the Web Portal measured it. It now re-resolves under the bar's theme, as `--psi-app-shell-sidebar-fg` does in the sidebar.
- **What can change for you.** If your `body`, or an ancestor of the `NavBar`, sets a colour other than `--psi-fg-primary`, plain text and `currentColor` icons in the bar now take `--psi-fg-primary`. Set `--psi-navbar-fg` to keep your colour. Buttons and links in the bar are unchanged.
- The `Frame` stories show plain text in the header.
