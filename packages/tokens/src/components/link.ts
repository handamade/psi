/** Link component tokens (--psi-link-*) — D119. Bound by the .psi-link
 * utility (utilities.css), which the React Link applies. fg aliases fgAccent,
 * gated at 4.5 on bgPrimary, bgSecondary and fillTintAccent. fg-hover mixes
 * toward fgPrimary in oklab, which raises contrast in light and dark alike;
 * link-tokens.test.ts asserts it per shipped theme. fg-current aliases
 * fgPrimary, gated on every surface. The underline is not a token that can be
 * turned off: against body text the accent scores ~2:1, so the line is what
 * tells a link from its sentence (WCAG 1.4.1). */
export const linkVars: Record<string, string> = {
  fg: "var(--psi-fg-accent)",
  "fg-hover": "color-mix(in oklab, var(--psi-link-fg) 70%, var(--psi-fg-primary))",
  "fg-current": "var(--psi-fg-primary)",
  "font-weight-current": "500",
  "underline-thickness": "1px",
  "underline-thickness-hover": "2px",
  // em, so the gap scales with the text the link sits in.
  "underline-offset": "0.2em",
  "focus-ring": "var(--psi-border-focus)",
  radius: "var(--psi-radius-4)",
};
