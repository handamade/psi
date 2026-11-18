---
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
---

`AppShell` can animate its sidebar (D142). `sidebarMotion="slide"` runs the sidebar's column to 0 and back, fading the sidebar, while its content holds still at the open width; main's rounded corner (D110) follows, and the edge line (D114) rides the moving edge. The default, `"instant"`, keeps today's markup and look.

Timing comes from two new tokens, never a prop: `--psi-app-shell-sidebar-duration` and `--psi-app-shell-sidebar-ease`. They alias the `move` motion preset (200ms, `--psi-ease-soft`, D141), so `prefers-reduced-motion` makes the sidebar instant, and the theme gate holds a theme's duration to a step or a preset.

Closed under `"slide"`, the sidebar is `visibility: hidden` instead of `hidden`. It leaves the tab order and the accessibility tree when the close ends. Its content sits in one inner `<div>` that scrolls, so code that scrolls the sidebar must scroll that wrapper. Right-to-left mirrors with no extra setup. With no `sidebar` content, `"slide"` is the instant frame.

In both modes, a sidebar that closes while it holds focus now hands focus to the toggle whose `aria-controls` names it, or to `main` when there is none. Before, focus fell to `<body>`.
