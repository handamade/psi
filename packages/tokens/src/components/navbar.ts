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
};
