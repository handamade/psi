import { clampChroma, formatHex, wcagContrast } from "culori";

/** OKLCH → gamut-clamped sRGB hex. Mirrors what the resolver emits, so a
 * solved value renders as the same colour the token build would produce. */
export function hexFor(l: number, c: number, h: number): string {
  const clamped = clampChroma({ mode: "oklch", l, c, h }, "oklch");
  return formatHex(clamped) ?? "#000000";
}

/** The repo's one WCAG implementation, shared with contrast-matrix.ts. */
export function contrastOf(aHex: string, bHex: string): number {
  return wcagContrast(aHex, bHex);
}

const ITERATIONS = 28;

/**
 * Binary-search lightness until a colour clears `target` against `against`.
 *
 * `direction` says which way legibility lies: "darker" for ink on a light
 * canvas, "lighter" for ink on a dark one. The search runs between the
 * canvas-side bound and the far extreme, converging on the *least* extreme
 * lightness that still clears the ratio — so a solved colour stays as close
 * to the brand's intent as the target allows.
 *
 * If the target is unreachable at this chroma and hue, the extreme is
 * returned: the most legible value available rather than a thrown error.
 * Callers pair this with a chroma reduction, which is what makes the target
 * reachable for saturated hues.
 */
export function solveL(opts: {
  c: number;
  h: number;
  against: string;
  target: number;
  direction: "darker" | "lighter";
}): number {
  const { c, h, against, target, direction } = opts;
  const extreme = direction === "darker" ? 0 : 1;

  if (contrastOf(hexFor(extreme, c, h), against) < target) {
    return extreme; // Unreachable at this chroma — hand back the best available.
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

  return best;
}
