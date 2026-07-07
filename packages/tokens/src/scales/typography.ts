export type Weight = "regular" | "medium" | "semibold" | "bold";
export const WEIGHT_VALUES: Record<Weight, number> = {
  regular: 400, medium: 500, semibold: 600, bold: 700,
};
export interface TypographyCombo { fontSize: number; lineHeight: number; weight: Weight; }
export const comboName = (c: TypographyCombo) => `${c.fontSize}-${c.lineHeight}-${c.weight}`;

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
];
