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

/** Button component tokens (--ds-button-*). Values may reference semantic
 * tokens and the component's own tokens; hover/active derive from the
 * component's own bg so one override retunes all states (principle 3). */
export const buttonVars: Record<string, string> = {
  "accent-bg": "var(--ds-fill-accent)",
  "accent-bg-hover": "oklch(from var(--ds-button-accent-bg) calc(l - 0.04) c h)",
  "accent-bg-active": "oklch(from var(--ds-button-accent-bg) calc(l - 0.08) c h)",
  "accent-fg": "var(--ds-fg-on-accent)",

  "accent-subtle-bg": "var(--ds-fill-tint-accent)",
  "accent-subtle-bg-hover": "oklch(from var(--ds-button-accent-subtle-bg) l c h / 0.18)",
  "accent-subtle-bg-active": "oklch(from var(--ds-button-accent-subtle-bg) l c h / 0.24)",
  "accent-subtle-fg": "var(--ds-fg-accent)",

  "neutral-bg": "var(--ds-fill-neutral3)",
  "neutral-bg-hover": "oklch(from var(--ds-button-neutral-bg) calc(l - 0.04) c h)",
  "neutral-bg-active": "oklch(from var(--ds-button-neutral-bg) calc(l - 0.08) c h)",
  "neutral-fg": "var(--ds-fg-primary)",

  "neutral-subtle-bg": "var(--ds-fill-neutral1)",
  "neutral-subtle-bg-hover": "oklch(from var(--ds-button-neutral-subtle-bg) calc(l - 0.04) c h)",
  "neutral-subtle-bg-active": "oklch(from var(--ds-button-neutral-subtle-bg) calc(l - 0.08) c h)",
  "neutral-subtle-fg": "var(--ds-fg-primary)",

  "ghost-bg": "transparent",
  "ghost-bg-hover": "var(--ds-fill-neutral3)",
  "ghost-bg-active": "var(--ds-fill-neutral4)",
  "ghost-fg": "var(--ds-fg-primary)",

  "danger-bg": "var(--ds-fill-danger)",
  "danger-bg-hover": "oklch(from var(--ds-button-danger-bg) calc(l - 0.04) c h)",
  "danger-bg-active": "oklch(from var(--ds-button-danger-bg) calc(l - 0.08) c h)",
  "danger-fg": "var(--ds-fg-static-white)",

  "danger-subtle-bg": "var(--ds-fill-tint-danger)",
  "danger-subtle-bg-hover": "oklch(from var(--ds-button-danger-subtle-bg) l c h / 0.18)",
  "danger-subtle-bg-active": "oklch(from var(--ds-button-danger-subtle-bg) l c h / 0.24)",
  "danger-subtle-fg": "var(--ds-fg-danger)",

  "outline-bg": "transparent",
  "outline-bg-hover": "var(--ds-fill-accent)",
  "outline-bg-active": "oklch(from var(--ds-fill-accent) calc(l - 0.04) c h)",
  "outline-fg": "var(--ds-fg-primary)",
  // Hover fills accent; label follows the accent variant's binding (fgOnAccent,
  // D37) — the literal "canvas label" fails AA in default light/dark.
  "outline-fg-hover": "var(--ds-button-accent-fg)",
  "outline-border": "var(--ds-border-strong)",

  "focus-ring": "var(--ds-border-focus)",
};
