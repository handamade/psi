/** Tag component tokens (--psi-tag-*). Solid variants map to fill + foreground
 * pairs; subtle variants add tint fills. Warning label uses fg-static-black
 * (D22) instead of fg-primary for contrast and visual emphasis. */
export const tagVars: Record<string, string> = {
  "neutral-bg": "var(--psi-fill-neutral3)",
  "neutral-fg": "var(--psi-fg-primary)",

  "accent-bg": "var(--psi-fill-accent)",
  "accent-fg": "var(--psi-fg-on-accent)",

  "success-bg": "var(--psi-fill-success)",
  "success-fg": "var(--psi-fg-static-white)",

  "warning-bg": "var(--psi-fill-warning)",
  "warning-fg": "var(--psi-fg-static-black)",

  "danger-bg": "var(--psi-fill-danger)",
  "danger-fg": "var(--psi-fg-static-white)",

  "neutral-subtle-bg": "var(--psi-fill-neutral2)",
  "neutral-subtle-fg": "var(--psi-fg-secondary)",

  "accent-subtle-bg": "var(--psi-fill-tint-accent)",
  "accent-subtle-fg": "var(--psi-fg-accent)",

  "success-subtle-bg": "var(--psi-fill-tint-success)",
  "success-subtle-fg": "var(--psi-fg-success)",

  "warning-subtle-bg": "var(--psi-fill-tint-warning)",
  "warning-subtle-fg": "var(--psi-fg-warning)",

  "danger-subtle-bg": "var(--psi-fill-tint-danger)",
  "danger-subtle-fg": "var(--psi-fg-danger)",

  "focus-ring": "var(--psi-border-focus)",
};
