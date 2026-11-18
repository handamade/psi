/** NavBar component tokens (--psi-navbar-*). bg defaults to the heavy scrim
 * (page canvas @ 0.82) — the blur-backed sticky-header treatment. */
export const navbarVars: Record<string, string> = {
  height: "4rem",
  bg: "var(--psi-scrim-heavy)",
  // D111 — colour inherits as a resolved value, so text in a bar under
  // data-psi-theme kept the page's. This alias re-resolves there, as
  // --psi-app-shell-sidebar-fg does. No contrast pair added: fgPrimary on bgPrimary
  // is gated in every theme, and the scrim is that canvas with the page behind it,
  // as for link-fg-hover, which has always painted fgPrimary here.
  fg: "var(--psi-fg-primary)",
  blur: "12px",
  border: "var(--psi-border-faint)",
  // D110 — 0 removes the line and its pixel, so the bar is exactly `height`. A
  // transparent border hides the line and keeps the pixel.
  "border-width": "1px",
  "link-fg": "var(--psi-fg-secondary)",
  "link-fg-hover": "var(--psi-fg-primary)",
  "focus-ring": "var(--psi-border-focus)",
  // D88 — the side padding of a fluid row; the same gutter .psi-container pads
  // with, reachable from the CSS Module only through a navbar token.
  gutter: "var(--psi-gutter)",
  // D140 — the brand column of `brandAlign="sidebar"`, measured from the bar's
  // inline-start edge. The brand ends at the AppShell sidebar's width, and
  // starts where a 32px IconButton holding an icon the size of the sidebar's
  // icons puts that icon on the sidebar's icon column: the sidebar's padding
  // plus a NavTree entry's (space-12, hardcoded in nav-tree.module.css), less
  // half the square's room around the icon. 8 + 12 - (32 - 16) / 2 = 12px.
  // Both resolve where they are declared: at :root, or in a theme that
  // overrides what they read (D139). Set inline on a narrower element, the
  // sidebar width does not reach them: set brand-width beside it.
  "brand-width": "var(--psi-app-shell-sidebar-width)",
  "brand-inset": "calc(var(--psi-app-shell-sidebar-padding) + var(--psi-space-12) - (var(--psi-button-32-height) - var(--psi-nav-tree-icon-size)) / 2)",
};
