import { clampChroma, formatHex, wcagContrast } from "culori";

/** OKLCH → gamut-clamped sRGB hex. Mirrors what the resolver emits, so a
 * solved value renders as the same colour the token build would produce. */
export function hexFor(l: number, c: number, h: number): string {
  if (!Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(h)) {
    // culori coerces NaN to 0, which yields #000000 — a colour that trivially
    // clears contrast against any light canvas. Failing loudly here keeps a
    // bug upstream from masquerading as a passing theme.
    throw new Error(`hexFor: non-finite OKLCH (l=${l}, c=${c}, h=${h})`);
  }
  const clamped = clampChroma({ mode: "oklch", l, c, h }, "oklch");
  return formatHex(clamped) ?? "#000000";
}

/** The repo's one WCAG implementation, shared with contrast-matrix.ts. */
export function contrastOf(aHex: string, bHex: string): number {
  return wcagContrast(aHex, bHex);
}

const ITERATIONS = 28;

export interface SolvedL {
  /** The chosen lightness. */
  l: number;
  /** True when `l` genuinely clears `target`. False means the target was
   * unreachable at this chroma and hue, and `l` is merely the most legible
   * value available — the caller MUST reduce chroma and try again. */
  cleared: boolean;
}

/**
 * Binary-search lightness until a colour clears `target` against `against`.
 *
 * `direction` says which way legibility lies: "darker" for ink on a light
 * canvas, "lighter" for ink on a dark one. The search runs between the
 * canvas-side bound and the far extreme, converging on the *least* extreme
 * lightness that still clears the ratio — so a solved colour stays as close
 * to the brand's intent as the target allows.
 *
 * If the target is unreachable at this chroma and hue, `cleared: false` is
 * returned along with the extreme: the most legible value available rather
 * than a thrown error. Callers pair this with a chroma reduction, which is
 * what makes the target reachable for saturated hues — but they must check
 * `cleared` to know when that retry is required, since a below-AA `l` looks
 * identical to a solved one otherwise.
 */
export function solveL(opts: {
  c: number;
  h: number;
  against: string;
  target: number;
  direction: "darker" | "lighter";
}): SolvedL {
  const { c, h, against, target, direction } = opts;
  const extreme = direction === "darker" ? 0 : 1;

  if (contrastOf(hexFor(extreme, c, h), against) < target) {
    // Unreachable at this chroma — hand back the best available, flagged.
    return { l: extreme, cleared: false };
  }

  let lo = direction === "darker" ? 0 : 1; // known to clear
  let hi = direction === "darker" ? 1 : 0; // known to fail (or nearly)
  let best = extreme;

  for (let i = 0; i < ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    if (contrastOf(hexFor(mid, c, h), against) >= target) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return { l: best, cleared: true };
}
