import type { ResolvedTheme } from "../src/dsl/resolver.js";
import { camelToKebab } from "./emit-css.js";
import { spacingScale } from "../src/scales/spacing.js";
import { sizeScale } from "../src/scales/sizes.js";
import { radiusScale } from "../src/scales/radius.js";
import { typographyCombos, comboName, WEIGHT_VALUES } from "../src/scales/typography.js";

const GROUPS = ["bg", "fg", "fill", "border"] as const;

export function emitDTCG(themeName: string, resolved: ResolvedTheme): string {
  const color: Record<string, Record<string, unknown>> = {};
  for (const t of Object.values(resolved)) {
    const kebab = camelToKebab(t.name);
    const group = GROUPS.find((g) => kebab.startsWith(`${g}-`)) ?? "misc";
    const key = group === "misc" ? kebab : kebab.slice(group.length + 1);
    (color[group] ??= {})[key] = {
      $type: "color",
      $value: t.oklch.alpha !== undefined
        ? `${t.hex}${Math.round(t.oklch.alpha * 255).toString(16).padStart(2, "0")}`
        : t.hex,
      $description: t.formula,
    };
  }
  const dim = (px: number) => ({ $type: "dimension", $value: px === 0 ? "0" : `${px / 16}rem` });
  return JSON.stringify({
    $description: `DS tokens, theme "${themeName}". Generated — do not edit.`,
    color,
    dimension: {
      space: Object.fromEntries(spacingScale.map((px) => [String(px), dim(px)])),
      size: Object.fromEntries(sizeScale.map((px) => [String(px), dim(px)])),
      radius: Object.fromEntries(radiusScale.map((px) => [String(px), dim(px)])),
    },
    typography: Object.fromEntries(typographyCombos.map((c) => [comboName(c), {
      $type: "typography",
      $value: { fontFamily: "{fontFamily.sans}", fontSize: `${c.fontSize}px`, lineHeight: `${c.lineHeight}px`, fontWeight: WEIGHT_VALUES[c.weight] },
    }])),
    fontFamily: { sans: { $type: "fontFamily", $value: ["ui-sans-serif", "system-ui", "sans-serif"] } },
  }, null, 2);
}
