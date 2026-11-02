/** AppShell component tokens (--psi-app-shell-*) — D88.
 *
 * sidebar-width is a deliberate default for the sidebar column of the frame.
 * 16rem is a standalone literal, matching --psi-toolbar-control-width: no
 * shared scale reaches this range (sizeScale tops at 48, spacingScale at 144,
 * both for heights and gaps, not column widths). The header's height stays
 * --psi-navbar-height: the NavBar owns it.
 *
 * sidebar-bg, sidebar-fg and focus-ring alias the semantic layer, so under a
 * `data-psi-theme="dark"` sidebar inside a light page they re-resolve dark
 * (component tokens are declared under `:where(:root, [data-psi-theme])`).
 * The theme paints no background of its own: the sidebar paints sidebar-bg.
 *
 * No contrast pair added: fgPrimary on bgPrimary is already gated in every
 * theme, dark included, and the pinned pair count does not move.
 *
 * D110 — bg, main-bg and main-radius draw a frame whose main is a surface with
 * a rounded top-start corner. They paint nothing by default, not a semantic
 * alias: main-bg at --psi-bg-primary would paint over whatever a consumer shows
 * behind the frame. bg shows only behind the corner, so it holds no text, and
 * it must equal the canvas of the theme on the header and the sidebar. No var()
 * reaches a sub-theme from the page's scope and --psi-bg-inverted is another
 * colour, so it is the sub-theme's value, written in the theme file. main-radius
 * is its own token: --psi-surface-radius also rounds Dialog, Panel, Menu, Table
 * and Toast. No contrast pair added: main takes page content, which fgPrimary on
 * bgPrimary already gates for the expected value. */
export const appShellVars: Record<string, string> = {
  "sidebar-width": "16rem",
  "sidebar-bg": "var(--psi-bg-primary)",
  "sidebar-fg": "var(--psi-fg-primary)",
  "focus-ring": "var(--psi-border-focus)",
  bg: "transparent",
  "main-bg": "transparent",
  "main-radius": "0",
};
