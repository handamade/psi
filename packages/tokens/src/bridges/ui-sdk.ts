/** D146 — UI SDK's `--ui-*` tokens, each aliased to one Psi token. Emitted by
 * scripts/emit-bridges.ts into dist/ui-sdk.css, in @layer psi.ui-sdk. */

export const UI_SDK_LAYER_LINE =
  "@layer ui-sdk, psi.base, psi.theme, psi.components, psi.utilities, psi.ui-sdk;";
export const UI_SDK_TAILWIND_LAYER_LINE =
  "@layer theme, base, components, psi.base, psi.theme, psi.components, psi.utilities, psi.ui-sdk, utilities;";

export const uiSdkTokenMap: Record<string, string> = {
  background: "var(--psi-bg-primary)",
  foreground: "var(--psi-fg-primary)",
  muted: "var(--psi-fill-neutral1)",
  "muted-foreground": "var(--psi-fg-secondary)",
  border: "var(--psi-border-faint)",
  input: "var(--psi-border-control)",
  primary: "var(--psi-fill-accent)",
  "primary-foreground": "var(--psi-fg-on-accent)",
  destructive: "var(--psi-fg-danger)",
  ring: "var(--psi-border-focus)",
  "ring-border": "var(--psi-border-focus)",
  overlay: "var(--psi-scrim-medium)",
  radius: "var(--psi-control-radius)",
  spacing: "var(--psi-space-4)",
  // The two literals: Psi's type tokens are `font` shorthands with no size
  // token. These copy --psi-text-14-20-*, the style of Psi's 32px controls.
  "font-size": "0.875rem",
  "line-height": "calc(20 / 14)",
  "font-sans": "var(--psi-font-sans)",
  "font-mono": "var(--psi-font-mono)",
};

export type UiSdkRole =
  | "text" | "danger-text" | "text-on-accent" | "surface" | "accent-fill"
  | "control-border" | "focus" | "scrim" | "decorative";

export const uiSdkColourRoles: Record<string, UiSdkRole> = {
  background: "surface",
  foreground: "text",
  muted: "surface",
  "muted-foreground": "text",
  border: "decorative",
  input: "control-border",
  primary: "accent-fill",
  "primary-foreground": "text-on-accent",
  destructive: "danger-text",
  ring: "focus",
  "ring-border": "focus",
  overlay: "scrim",
};

/** Left as UI SDK sets them (spec §2): no Psi elevation token for the shadow;
 * the icons are mask shapes; the component knobs follow the map
 * (--ui-rating-color follows --ui-primary). */
export const uiSdkLeftAlone: string[] = [
  "shadow",
  "icon", "icon-size",
  "icon-calendar", "icon-check", "icon-chevron", "icon-eye", "icon-eye-off",
  "icon-minus", "icon-pipette", "icon-plus", "icon-star", "icon-x",
  "rating-color", "rating-direction",
  "tree-indent", "grid-line", "checker",
];
