import { formatHex, clampChroma } from "culori";
import type {
  ChannelOp,
  Palette,
  ResolvedToken,
  SlotMap,
  ThemeDef,
  TokenDef,
} from "./types.js";

// ── Resolved theme type ────────────────────────────────────────────

export type ResolvedTheme = Record<string, ResolvedToken>;

// ── Channel operation application ──────────────────────────────────

function applyOp(base: number, op?: ChannelOp): number {
  if (!op) return base;
  switch (op.op) {
    case "set":
      return op.value;
    case "delta":
      return base + op.value;
    case "cap":
      return Math.min(base, op.value);
  }
}

// ── Formula string generation ──────────────────────────────────────

function formatOp(channel: string, op: ChannelOp): string {
  return `${channel} ${op.op}(${op.value})`;
}

function formatFormula(def: TokenDef): string {
  const source =
    def.from.type === "slot"
      ? `slot(${def.from.name})`
      : `ref(${def.from.name})`;

  const ops: string[] = [];
  if (def.l) ops.push(formatOp("L", def.l));
  if (def.c) ops.push(formatOp("C", def.c));
  if (def.h) ops.push(formatOp("H", def.h));
  if (def.alpha !== undefined) ops.push(`alpha(${def.alpha})`);

  return ops.length > 0 ? `${source} → ${ops.join(", ")}` : source;
}

// ── Resolver ───────────────────────────────────────────────────────

export function resolve(
  theme: ThemeDef,
  palette: Palette,
  slots: SlotMap,
): ResolvedTheme {
  const cache = new Map<string, ResolvedToken>();

  function resolveToken(name: string): ResolvedToken {
    const cached = cache.get(name);
    if (cached) return cached;

    const def = theme[name];
    if (!def) {
      throw new Error(`Unknown token: "${name}"`);
    }

    // Resolve base L/C/H from source
    let baseL: number;
    let baseC: number;
    let baseH: number;
    let baseAlpha: number | undefined;

    if (def.from.type === "slot") {
      const paletteName = (slots as Record<string, string>)[def.from.name];
      if (!paletteName) {
        throw new Error(
          `Unknown slot: "${def.from.name}"`,
        );
      }
      const entry = palette[paletteName];
      if (!entry) {
        throw new Error(
          `Unknown palette entry: "${paletteName}" (from slot "${def.from.name}")`,
        );
      }
      baseL = entry.l;
      baseC = entry.c;
      baseH = entry.h;
    } else {
      // ref — recursively resolve the referenced token
      const refToken = resolveToken(def.from.name);
      baseL = refToken.oklch.l;
      baseC = refToken.oklch.c;
      baseH = refToken.oklch.h;
      baseAlpha = refToken.oklch.alpha;
    }

    // Apply channel operations
    const l = applyOp(baseL, def.l);
    const c = applyOp(baseC, def.c);
    const h = applyOp(baseH, def.h);
    const alpha = def.alpha ?? baseAlpha;

    // Build OKLCH color for culori
    const oklchColor: {
      mode: "oklch";
      l: number;
      c: number;
      h: number;
      alpha?: number;
    } = {
      mode: "oklch" as const,
      l,
      c,
      h,
    };
    if (alpha !== undefined) {
      oklchColor.alpha = alpha;
    }

    // Gamut-map to sRGB via chroma clamping
    const clamped = clampChroma(oklchColor, "oklch", "rgb");

    // Extract the gamut-mapped OKLCH values
    const clampedL = clamped?.l ?? l;
    const clampedC = clamped?.c ?? 0;
    const clampedH = clamped?.h ?? h;

    // Generate hex (always 6-digit sRGB)
    const hex = formatHex(clamped ?? oklchColor) ?? "#000000";

    const resolved: ResolvedToken = {
      name,
      oklch: {
        l: clampedL,
        c: clampedC,
        h: clampedH,
        ...(alpha !== undefined ? { alpha } : {}),
      },
      hex,
      formula: formatFormula(def),
      ...(def.scopes !== undefined ? { scopes: def.scopes } : {}),
    };

    cache.set(name, resolved);
    return resolved;
  }

  const result: ResolvedTheme = {};
  for (const name of Object.keys(theme)) {
    result[name] = resolveToken(name);
  }
  return result;
}
