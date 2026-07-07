/** Tag component tokens (--ds-tag-*). Solid variants map to fill + foreground
 * pairs; subtle variants add tint fills. Warning label uses fg-static-black
 * (D22) instead of fg-primary for contrast and visual emphasis. */
export const tagVars: Record<string, string> = {
  "neutral-bg": "var(--ds-fill-neutral3)",
  "neutral-fg": "var(--ds-fg-primary)",

  "accent-bg": "var(--ds-fill-accent)",
  "accent-fg": "var(--ds-fg-static-white)",

  "success-bg": "var(--ds-fill-success)",
  "success-fg": "var(--ds-fg-static-white)",

  "warning-bg": "var(--ds-fill-warning)",
  "warning-fg": "var(--ds-fg-static-black)",

  "danger-bg": "var(--ds-fill-danger)",
  "danger-fg": "var(--ds-fg-static-white)",

  "neutral-subtle-bg": "var(--ds-fill-neutral2)",
  "neutral-subtle-fg": "var(--ds-fg-secondary)",

  "accent-subtle-bg": "var(--ds-fill-tint-accent)",
  "accent-subtle-fg": "var(--ds-fg-accent)",

  "success-subtle-bg": "var(--ds-fill-tint-success)",
  "success-subtle-fg": "var(--ds-fg-success)",

  "warning-subtle-bg": "var(--ds-fill-tint-warning)",
  "warning-subtle-fg": "var(--ds-fg-warning)",

  "danger-subtle-bg": "var(--ds-fill-tint-danger)",
  "danger-subtle-fg": "var(--ds-fg-danger)",

  "focus-ring": "var(--ds-border-focus)",
};
