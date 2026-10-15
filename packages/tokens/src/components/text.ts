/** Text component tokens (--psi-text-fg*) — D109. Pure indirection onto the
 * semantic layer. fgPrimary and fgSecondary are gated at 4.5 on every
 * surface in wcagAAPairs, so no new contrast pair. The prefix shares
 * `--psi-text-` with the type styles (`--psi-text-14-20-regular`); no type
 * style is named `fg`, so the two cannot collide. */
export const textVars: Record<string, string> = {
  fg: "var(--psi-fg-primary)",
  "fg-secondary": "var(--psi-fg-secondary)",
};
