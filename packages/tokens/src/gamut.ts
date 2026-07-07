import { differenceCiede2000 } from "culori";
import type { ChannelOp, Palette, SlotMap, ThemeDef } from "./dsl/types.js";
import type { ResolvedTheme } from "./dsl/resolver.js";

const dE = differenceCiede2000();

function applyOp(base: number, op?: ChannelOp): number {
  if (!op) return base;
  if (op.op === "set") return op.value;
  if (op.op === "delta") return base + op.value;
  return Math.min(base, op.value); // cap
}

/** Warn when sRGB clamping moved a resolved value by ΔE2000 > 2 (D19). */
export function gamutWarnings(
  resolved: ResolvedTheme,
  theme: ThemeDef,
  palette: Palette,
  slots: SlotMap,
): string[] {
  const warnings: string[] = [];
  const raw = new Map<string, { l: number; c: number; h: number }>();

  function rawOf(name: string): { l: number; c: number; h: number } {
    const hit = raw.get(name);
    if (hit) return hit;
    const def = theme[name]!;
    const base =
      def.from.type === "slot"
        ? palette[(slots as Record<string, string>)[def.from.name]]!
        : rawOf(def.from.name);
    const val = {
      l: applyOp(base.l, def.l),
      c: applyOp(base.c, def.c),
      h: applyOp(base.h, def.h),
    };
    raw.set(name, val);
    return val;
  }

  for (const name of Object.keys(theme)) {
    const pre = { mode: "oklch" as const, ...rawOf(name) };
    const post = { mode: "oklch" as const, ...resolved[name]!.oklch };
    const d = dE(pre, post);
    if (d > 2)
      warnings.push(
        `${name}: clamped ΔE ${d.toFixed(1)} (${JSON.stringify(rawOf(name))} → hex ${resolved[name]!.hex}) — adjust the palette anchor`,
      );
  }
  return warnings;
}
