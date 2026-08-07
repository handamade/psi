/** DescriptionList component tokens (--psi-description-list-*) — D70. Pure
 * indirection onto the semantic foreground family; exists because component
 * CSS may only bind its own family (psi/component-tokens-only).
 *
 * Colour only. Spacing comes from the global --psi-space-* scale, which the
 * scope gate already allows component CSS to bind directly, so aliasing it
 * here would add a layer that buys nothing. */
export const descriptionListVars: Record<string, string> = {
  /** The <dt>. Secondary by design: the value is the content, the term is its label. */
  "term-fg": "var(--psi-fg-secondary)",
  /** The <dd>. */
  "value-fg": "var(--psi-fg-primary)",
};
