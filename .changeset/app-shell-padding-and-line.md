---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A frame that pads its page, takes a banner and can draw a line at its sidebar (D113, D114).

- **`AppShell` now pads its page by 24px.** Two new tokens set it: `--psi-app-shell-main-padding-inline` and `--psi-app-shell-main-padding-block`. **What can change for you:** if your page already pads itself inside `AppShell`, it now has both paddings. Set the two tokens to `0`, or drop your own.
- **New `banner` prop.** Pass one page-level `Banner`, or several. It renders inside `<main>`, before the page, edge to edge, and the page starts one block padding below it. It scrolls with the page, and a value that renders nothing takes no space.
- **A line at the sidebar's edge.** `--psi-app-shell-sidebar-border-width` is `0` by default; `1px` draws a line on the sidebar's inline-end edge in `--psi-app-shell-sidebar-border`, which defaults to `--psi-border-faint`. Use it when the sidebar shares the page's background.
- The `WithBanner` and `SidebarLine` stories show both.
