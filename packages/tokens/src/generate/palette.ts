import type { Palette, SlotMap } from "../dsl/types.js";
import { contrastOf, hexFor, solveL } from "./solve.js";
import type { BrandVector, ChromaWord } from "./types.js";

/** Accent chroma by character. Values sit inside sRGB for most hues; the
 * solver (Task 4) caps per-hue where a given hue cannot carry them. */
const ACCENT_CHROMA: Readonly<Record<ChromaWord, number>> = {
  muted: 0.06,
  calm: 0.10,
  balanced: 0.15,
  vivid: 0.20,
  electric: 0.26,
};

/** Status hues are fixed: green reads as success and red as danger regardless
 * of the brand. Only their chroma follows the brand's character. */
const STATUS_HUES = { success: 155, warning: 75, danger: 25 } as const;

/** The accent's nominal lightness — kept unless a white label cannot sit on it. */
const ACCENT_L = 0.55;

/**
 * `fgOnAccent` is `ref.fgStaticWhite` in both base themes — pure white — and
 * `fillAccent` is `slot.accent` untouched, so `componentLabelPairs`' first
 * entry (`fgOnAccent` on `fillAccent`, the Button/Tag/Checkbox label) is
 * decided entirely here, by the accent anchor's own lightness. Nothing
 * downstream can rescue it: `solveOverrides` only controls the four text
 * tokens, and neither `fgOnAccent` nor `fillAccent` traces to any of them.
 *
 * At a flat `l: 0.55` the pair is not safe by construction. Swept over 360
 * hues × 5 chroma words, the worst case is hue 146 at `vivid` (c 0.20), which
 * renders white-on-accent at **4.4979:1** — under AA, and the exact failure
 * the prompt "bold calm app" produced. It cleared CI only because `derive.ts`
 * checked the 28-pair `wcagAAPairs` while `scripts/build.ts` gates committed
 * themes on all 33.
 *
 * So the accent is darkened — never lightened — to the lightest value that
 * still carries a white label at `LABEL_TARGET`, a deliberate margin above
 * 4.5 so that OKLCH→sRGB rounding and the 4-decimal truncation below cannot
 * eat the guarantee. Most hue/chroma combinations already clear it and keep
 * `l: 0.55` exactly.
 *
 * The alternative — solving `fgOnAccent` as a fifth escalating token — was
 * rejected: a failure on that pair traces to none of the tokens
 * `solveOverrides` escalates, so wiring the pair into the accept gate without
 * this fix converts a rare AA miss into a rare hard throw ("derivation
 * failed"), which is worse. Fixing the anchor makes the pair pass by
 * construction, which is what the headline claim actually says.
 *
 * The three other solid-label pairs (`fgStaticWhite` on `fillSuccess` /
 * `fillDanger`, `fgStaticBlack` on `fillWarning`) sit on fixed hues and were
 * measured at 5.16 / 5.21 / 6.94:1 worst-case across the same sweep, so they
 * need no equivalent treatment — but the sweep in
 * `__tests__/generate-derive.test.ts` gates all 33 pairs, not just this one.
 */
const LABEL_TARGET = 4.65;

function accentLightness(c: number, h: number): number {
  const white = "#ffffff";
  if (contrastOf(hexFor(ACCENT_L, c, h), white) >= LABEL_TARGET) return ACCENT_L;
  // Contrast against white rises monotonically as lightness falls, and black
  // clears any target, so `direction: "darker"` always converges — it returns
  // the LEAST extreme (lightest) L that still clears, keeping the accent as
  // close to the brand's intent as legibility allows.
  const solved = solveL({ c, h, against: white, target: LABEL_TARGET, direction: "darker" });
  // Truncate rather than round: the emitted `customers/<name>.ts` carries this
  // literal, and rounding UP would hand the token build a lightness a hair
  // above the one that was solved.
  return Math.floor(Math.min(ACCENT_L, solved.l) * 10_000) / 10_000;
}

export function buildBrandPalette(v: BrandVector): {
  palette: Palette;
  lightSlots: SlotMap;
  darkSlots: SlotMap;
} {
  const accentC = ACCENT_CHROMA[v.chroma];
  // Neutrals carry a trace of the brand hue so the pair reads as one family.
  const neutralC = Math.min(0.02, accentC * 0.12);
  const statusC = Math.max(0.14, Math.min(0.22, accentC));

  const palette: Palette = {
    brandInkLight: { l: 0.25, c: neutralC, h: v.hue },
    brandInkDark: { l: 0.95, c: neutralC, h: v.hue },
    brandCanvasLight: { l: 0.96, c: neutralC * 0.5, h: v.hue },
    brandCanvasDark: { l: 0.15, c: neutralC * 0.5, h: v.hue },
    brandAccent: { l: accentLightness(accentC, v.hue), c: accentC, h: v.hue },
    brandSuccess: { l: 0.52, c: statusC, h: STATUS_HUES.success },
    brandWarning: { l: 0.75, c: statusC, h: STATUS_HUES.warning },
    brandDanger: { l: 0.55, c: statusC, h: STATUS_HUES.danger },
    white: { l: 1.0, c: 0, h: 0 },
    black: { l: 0.0, c: 0, h: 0 },
  };

  const shared = {
    accent: "brandAccent",
    success: "brandSuccess",
    warning: "brandWarning",
    danger: "brandDanger",
  } as const;

  return {
    palette,
    lightSlots: { ink: "brandInkLight", canvas: "brandCanvasLight", ...shared },
    darkSlots: { ink: "brandInkDark", canvas: "brandCanvasDark", ...shared },
  };
}
