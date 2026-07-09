import type { ResolvedTheme } from "../src/dsl/resolver.js";
import { camelToKebab } from "./emit-css.js";
import { spacingScale } from "../src/scales/spacing.js";
import { sizeScale } from "../src/scales/sizes.js";
import { radiusScale } from "../src/scales/radius.js";
import { typographyCombos, comboName, WEIGHT_VALUES, displayCombos, displayName } from "../src/scales/typography.js";
import { durationScale } from "../src/scales/motion.js";
import { breakpoints, container } from "../src/scales/layout.js";

const GROUPS = ["bg", "fg", "fill", "border", "scrim"] as const;

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
      breakpoint: Object.fromEntries(Object.entries(breakpoints).map(([k, v]) => [k, { $type: "dimension", $value: `${v}px` }])),
      container: { max: dim(container.max), gutter: dim(container.gutter), gutterNarrow: dim(container.gutterNarrow) },
    },
    typography: Object.fromEntries(typographyCombos.map((c) => [comboName(c), {
      $type: "typography",
      $value: { fontFamily: `{fontFamily.${c.role ?? "sans"}}`, fontSize: `${c.fontSize}px`, lineHeight: `${c.lineHeight}px`, fontWeight: WEIGHT_VALUES[c.weight] },
    }])),
    display: Object.fromEntries(displayCombos.map((d) => [displayName(d), {
      $type: "typography",
      $value: { fontFamily: "{fontFamily.display}", fontSize: d.min === d.max ? `${d.min}px` : `clamp(${d.min}px, ${d.vw}vw, ${d.max}px)`, lineHeight: d.lineHeight, fontWeight: WEIGHT_VALUES[d.weight], letterSpacing: `${d.tracking}em` },
    }])),
    duration: Object.fromEntries(durationScale.map((ms) => [String(ms), { $type: "duration", $value: `${ms}ms` }])),
    cubicBezier: {
      standard: { $type: "cubicBezier", $value: [0.25, 0.1, 0.25, 1] },
      "in-out": { $type: "cubicBezier", $value: [0.42, 0, 0.58, 1] },
      soft: { $type: "cubicBezier", $value: [0.2, 0.6, 0.2, 1] },
    },
    fontFamily: {
      sans: { $type: "fontFamily", $value: ["ui-sans-serif", "system-ui", "sans-serif"] },
      serif: { $type: "fontFamily", $value: ["Georgia", "Times New Roman", "serif"] },
      mono: { $type: "fontFamily", $value: ["ui-monospace", "SFMono-Regular", "monospace"] },
      display: { $type: "fontFamily", $value: ["ui-sans-serif", "system-ui", "sans-serif"] },
    },
  }, null, 2);
}
