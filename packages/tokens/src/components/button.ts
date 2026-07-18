/** Button component variants */
export const BUTTON_VARIANTS = [
  "accent",
  "accent-subtle",
  "neutral",
  "neutral-subtle",
  "ghost",
  "danger",
  "danger-subtle",
  "outline",
] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

/** Button component tokens (--psi-button-*). Values may reference semantic
 * tokens and the component's own tokens; hover/active derive from the
 * component's own bg so one override retunes all states (principle 3). */
export const buttonVars: Record<string, string> = {
  "accent-bg": "var(--psi-fill-accent)",
  "accent-bg-hover": "oklch(from var(--psi-button-accent-bg) calc(l - 0.04) c h)",
  "accent-bg-active": "oklch(from var(--psi-button-accent-bg) calc(l - 0.08) c h)",
  "accent-fg": "var(--psi-fg-on-accent)",

  "accent-subtle-bg": "var(--psi-fill-tint-accent)",
  "accent-subtle-bg-hover": "oklch(from var(--psi-button-accent-subtle-bg) l c h / 0.18)",
  "accent-subtle-bg-active": "oklch(from var(--psi-button-accent-subtle-bg) l c h / 0.24)",
  "accent-subtle-fg": "var(--psi-fg-accent)",

  "neutral-bg": "var(--psi-fill-neutral3)",
  "neutral-bg-hover": "oklch(from var(--psi-button-neutral-bg) calc(l - 0.04) c h)",
  "neutral-bg-active": "oklch(from var(--psi-button-neutral-bg) calc(l - 0.08) c h)",
  "neutral-fg": "var(--psi-fg-primary)",

  "neutral-subtle-bg": "var(--psi-fill-neutral1)",
  "neutral-subtle-bg-hover": "oklch(from var(--psi-button-neutral-subtle-bg) calc(l - 0.04) c h)",
  "neutral-subtle-bg-active": "oklch(from var(--psi-button-neutral-subtle-bg) calc(l - 0.08) c h)",
  "neutral-subtle-fg": "var(--psi-fg-primary)",

  "ghost-bg": "transparent",
  "ghost-bg-hover": "var(--psi-fill-neutral3)",
  "ghost-bg-active": "var(--psi-fill-neutral4)",
  "ghost-fg": "var(--psi-fg-primary)",

  "danger-bg": "var(--psi-fill-danger)",
  "danger-bg-hover": "oklch(from var(--psi-button-danger-bg) calc(l - 0.04) c h)",
  "danger-bg-active": "oklch(from var(--psi-button-danger-bg) calc(l - 0.08) c h)",
  "danger-fg": "var(--psi-fg-static-white)",

  "danger-subtle-bg": "var(--psi-fill-tint-danger)",
  "danger-subtle-bg-hover": "oklch(from var(--psi-button-danger-subtle-bg) l c h / 0.18)",
  "danger-subtle-bg-active": "oklch(from var(--psi-button-danger-subtle-bg) l c h / 0.24)",
  "danger-subtle-fg": "var(--psi-fg-danger)",

  "outline-bg": "transparent",
  "outline-bg-hover": "var(--psi-fill-accent)",
  "outline-bg-active": "oklch(from var(--psi-fill-accent) calc(l - 0.04) c h)",
  "outline-fg": "var(--psi-fg-primary)",
  // Hover fills accent; label follows the accent variant's binding (fgOnAccent,
  // D37) — the literal "canvas label" fails AA in default light/dark.
  "outline-fg-hover": "var(--psi-button-accent-fg)",
  "outline-border": "var(--psi-border-strong)",

  "focus-ring": "var(--psi-border-focus)",
};
