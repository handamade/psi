export type Weight = "regular" | "medium" | "semibold" | "bold" | "extrabold" | "black";
export const WEIGHT_VALUES: Record<Weight, number> = {
  regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900,
};
export type ComboRole = "sans" | "serif" | "mono";
export interface TypographyCombo { fontSize: number; lineHeight: number; weight: Weight; role?: ComboRole; }
export const comboName = (c: TypographyCombo) =>
  `${c.role && c.role !== "sans" ? `${c.role}-` : ""}${c.fontSize}-${c.lineHeight}-${c.weight}`;
export const comboFontVar = (c: TypographyCombo) => `--psi-font-${c.role ?? "sans"}`;

export interface DisplayCombo { min: number; max: number; vw: number; lineHeight: number; weight: Weight; tracking: number; }
/** Fluid display tier (D28): --psi-display-{min}-{max}-{weight}, pixel-true at
 * both clamp endpoints. Tracking/uppercase live in the .psi-display-* utilities
 * because the font shorthand can't carry them. */
export const displayCombos: DisplayCombo[] = [
  { min: 56, max: 128, vw: 9, lineHeight: 0.95, weight: "black", tracking: -0.02 },
  { min: 36, max: 64, vw: 5, lineHeight: 1.05, weight: "black", tracking: -0.02 },
  { min: 32, max: 32, vw: 0, lineHeight: 1.1, weight: "extrabold", tracking: -0.01 },
];
export const displayName = (d: DisplayCombo) => `${d.min}-${d.max}-${d.weight}`;

/** Explicit combo list (spec principle 2/4): adding a combo is one line, never a rename. */
export const typographyCombos: TypographyCombo[] = [
  { fontSize: 12, lineHeight: 16, weight: "regular" },
  { fontSize: 12, lineHeight: 16, weight: "medium" },
  { fontSize: 14, lineHeight: 20, weight: "regular" },
  { fontSize: 14, lineHeight: 20, weight: "medium" },
  { fontSize: 16, lineHeight: 20, weight: "regular" },
  { fontSize: 16, lineHeight: 24, weight: "regular" },
  { fontSize: 16, lineHeight: 24, weight: "medium" },
  { fontSize: 18, lineHeight: 28, weight: "medium" },
  { fontSize: 20, lineHeight: 28, weight: "semibold" },
  { fontSize: 24, lineHeight: 32, weight: "medium" },
  { fontSize: 30, lineHeight: 36, weight: "bold" },
  // Serif body tier (WS2 — portfolio coverage)
  { fontSize: 18, lineHeight: 28, weight: "regular", role: "serif" },
  { fontSize: 20, lineHeight: 30, weight: "regular", role: "serif" },
  { fontSize: 20, lineHeight: 32, weight: "regular", role: "serif" },
  { fontSize: 24, lineHeight: 36, weight: "regular", role: "serif" },
  { fontSize: 28, lineHeight: 40, weight: "regular", role: "serif" },
  // Mono label tier (WS2)
  { fontSize: 13, lineHeight: 20, weight: "regular", role: "mono" },
  { fontSize: 14, lineHeight: 20, weight: "regular", role: "mono" },
  { fontSize: 15, lineHeight: 24, weight: "regular", role: "mono" },
  { fontSize: 15, lineHeight: 24, weight: "medium", role: "mono" },
];
