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
 * bgPrimary already gates for the expected value.
 *
 * D113 — main-padding-inline and main-padding-block pad the page inside main,
 * and the banner wrapper cancels them to sit edge to edge. The default is a
 * real 24px, not 0: a page that touches the frame's edges is no look to keep.
 * The keys carry no bg, fg or border segment, so they stay out of the colour
 * scope map, as the control geometry keys do (D54).
 *
 * D114 — sidebar-border and sidebar-border-width draw a line on the sidebar's
 * inline-end edge, the same pair as navbar's. Width 0 by default: no line and
 * no pixel. A transparent colour would have kept the pixel (D110 found that on
 * NavBar). The colour resolves under the sidebar's theme. No contrast pair: the
 * line separates two regions and identifies no control. */
export const appShellVars: Record<string, string> = {
  "sidebar-width": "16rem",
  "sidebar-bg": "var(--psi-bg-primary)",
  "sidebar-fg": "var(--psi-fg-primary)",
  "sidebar-border": "var(--psi-border-faint)",
  "sidebar-border-width": "0",
  "focus-ring": "var(--psi-border-focus)",
  bg: "transparent",
  "main-bg": "transparent",
  "main-radius": "0",
  "main-padding-inline": "var(--psi-space-24)",
  "main-padding-block": "var(--psi-space-24)",
};
