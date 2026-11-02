/** NavBar component tokens (--psi-navbar-*). bg defaults to the heavy scrim
 * (page canvas @ 0.82) — the blur-backed sticky-header treatment. */
export const navbarVars: Record<string, string> = {
  height: "4rem",
  bg: "var(--psi-scrim-heavy)",
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
