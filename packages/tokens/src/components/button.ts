/**
 * Button component token definitions.
 *
 * Each variant maps to CSS values for bg, bgHover, bgActive, and fg.
 * Hover/active states derive from a component-level custom property
 * (e.g. --ds-button-accent-bg) with a fallback to the semantic token,
 * so overriding the component property automatically retunes hover/active.
 */

export interface ButtonVariantTokens {
  bg: string;
  bgHover: string;
  bgActive: string;
  fg: string;
}

export type ButtonVariant =
  | "accent"
  | "accent-subtle"
  | "neutral"
  | "neutral-subtle"
  | "ghost"
  | "danger"
  | "danger-subtle";

export const buttonTokens: Record<ButtonVariant, ButtonVariantTokens> = {
  accent: {
    bg: "var(--ds-fill-accent)",
    bgHover:
      "oklch(from var(--ds-button-accent-bg, var(--ds-fill-accent)) calc(l - 0.04) c h)",
    bgActive:
      "oklch(from var(--ds-button-accent-bg, var(--ds-fill-accent)) calc(l - 0.08) c h)",
    fg: "var(--ds-fg-static-white)",
  },

  "accent-subtle": {
    bg: "var(--ds-fill-tint-accent)",
    bgHover:
      "oklch(from var(--ds-button-accent-subtle-bg, var(--ds-fill-tint-accent)) l c h / 0.18)",
    bgActive:
      "oklch(from var(--ds-button-accent-subtle-bg, var(--ds-fill-tint-accent)) l c h / 0.24)",
    fg: "var(--ds-fg-accent)",
  },

  neutral: {
    bg: "var(--ds-fill-neutral3)",
    bgHover:
      "oklch(from var(--ds-button-neutral-bg, var(--ds-fill-neutral3)) calc(l - 0.04) c h)",
    bgActive:
      "oklch(from var(--ds-button-neutral-bg, var(--ds-fill-neutral3)) calc(l - 0.08) c h)",
    fg: "var(--ds-fg-primary)",
  },

  "neutral-subtle": {
    bg: "var(--ds-fill-neutral1)",
    bgHover:
      "oklch(from var(--ds-button-neutral-subtle-bg, var(--ds-fill-neutral1)) calc(l - 0.04) c h)",
    bgActive:
      "oklch(from var(--ds-button-neutral-subtle-bg, var(--ds-fill-neutral1)) calc(l - 0.08) c h)",
    fg: "var(--ds-fg-primary)",
  },

  ghost: {
    bg: "transparent",
    bgHover: "var(--ds-fill-neutral3)",
    bgActive: "var(--ds-fill-neutral4)",
    fg: "var(--ds-fg-primary)",
  },

  danger: {
    bg: "var(--ds-fill-danger)",
    bgHover:
      "oklch(from var(--ds-button-danger-bg, var(--ds-fill-danger)) calc(l - 0.04) c h)",
    bgActive:
      "oklch(from var(--ds-button-danger-bg, var(--ds-fill-danger)) calc(l - 0.08) c h)",
    fg: "var(--ds-fg-static-white)",
  },

  "danger-subtle": {
    bg: "var(--ds-fill-tint-danger)",
    bgHover:
      "oklch(from var(--ds-button-danger-subtle-bg, var(--ds-fill-tint-danger)) l c h / 0.18)",
    bgActive:
      "oklch(from var(--ds-button-danger-subtle-bg, var(--ds-fill-tint-danger)) l c h / 0.24)",
    fg: "var(--ds-fg-danger)",
  },
};
