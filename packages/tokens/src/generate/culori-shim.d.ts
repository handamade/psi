/**
 * culori 4.x ships no type declarations (no `types` field, no .d.ts).
 * `src/generate` is the first code in this package that tsc type-checks --
 * everything else runs through untyped tsx -- so it is the first to need
 * these. Declared narrowly on purpose: a blanket `declare module "culori"`
 * would type the whole library as `any` and silence real mistakes in exactly
 * the file where the colour maths must be right.
 *
 * `rgb` is here for contrast-matrix.ts, which enters this program via
 * derive.ts. `differenceCiede2000` is here for gamut.ts, which enters it via
 * the D81 theme gate (src/theme/gate.ts).
 */
declare module "culori" {
  export interface Oklch {
    mode: "oklch";
    l: number;
    c: number;
    h?: number;
    alpha?: number;
  }

  export interface Rgb {
    mode: "rgb";
    r: number;
    g: number;
    b: number;
    alpha?: number;
  }

  export function wcagContrast(a: string | Oklch | Rgb, b: string | Oklch | Rgb): number;
  export function formatHex(color: string | Oklch | Rgb): string | undefined;
  export function clampChroma(color: Oklch, mode?: string, rgbGamut?: string): Oklch;
  export function rgb(color: string | Oklch | Rgb): Rgb | undefined;
  /** Returns a ΔE2000 metric over two colours. */
  export function differenceCiede2000(): (a: string | Oklch | Rgb, b: string | Oklch | Rgb) => number;
}
