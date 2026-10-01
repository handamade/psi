---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

An application shell (D88): a skip link, a full-width header, a collapsible dark sidebar holding a navigation tree, and a `main` that scrolls on its own. Every new prop defaults to today's behaviour.

- **`NavBar` renders `<nav>` only when it has children.** A bar with a brand and actions and no links no longer carries an empty navigation landmark. `navLabel?: string` names the links' `<nav>` (rest props land on the `<header>`, so it could not be named before). `fluid?: boolean` drops `psi-container` for a full-width row that keeps the gutter (`--psi-navbar-gutter`). `actions` keeps the trailing edge without links.
- **New `SkipLink`**: a plain `<a href="#main">`, visually hidden until it takes keyboard focus, then fixed at the inline-start top corner on a surface with the shared focus ring. No script: native fragment navigation focuses a focusable target. Tokens `--psi-skip-link-*`. Do not place a `ToastRegion` at `top-start` in an app with a skip link.
- **New `NavTree`, `NavGroup`, `NavItem`**: a `<nav aria-label>` around a list; `NavGroup` is a controlled `<button aria-expanded aria-controls>` over a list that is `hidden` when closed; `NavItem` styles the router link passed to it, with the current page set by weight, a surface and an inline-start bar. `NavItem` also takes `href` and `current` to render its own anchor, for plain links and presets. Native keyboard only, no roving focus. Tokens `--psi-nav-tree-*`.
- **New `AppShell`**: a grid filling the viewport with the header in its own row and the sidebar and `main` each scrolling on their own, so nothing scrolls under the header (WCAG 2.2 Focus Not Obscured, no `scroll-padding`). Props `skipLink`, `header`, `sidebar`, `sidebarOpen` (controlled, default `true`; closed is `hidden`, not narrowed), `sidebarTheme`, `sidebarId`, `mainId`. `main` is the skip link's target (`tabIndex={-1}`). A desktop frame: no responsive drawer. Tokens `--psi-app-shell-*`.
- **New pattern `app-shell`**: a skip link, a fluid `NavBar` with a Menu toggle, a dark `NavTree` sidebar and a scrolling main.
