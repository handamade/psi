/** PageHeading component tokens (--psi-page-heading-*) — D118. The font is the
 * display text style; a brand swaps it in componentOverrides, as ember swaps
 * button-font. fg aliases fgPrimary, gated at 4.5 on every surface in
 * wcagAAPairs, so there is no new contrast pair. */
export const pageHeadingVars: Record<string, string> = {
  font: "var(--psi-text-display-24-32-medium)",
  fg: "var(--psi-fg-primary)",
};
