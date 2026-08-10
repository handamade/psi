import { checkContrast, wcagAAPairs } from "../contrast-matrix.js";
import { resolve, type ResolvedTheme } from "../dsl/resolver.js";
import { cap, set, slot, token } from "../dsl/builders.js";
import type { Palette, SlotMap, ThemeDef, TokenDef } from "../dsl/types.js";
import {
  assembleCustomerTheme,
  type CustomerTheme,
} from "../themes/customers/index.js";
import { buildBrandPalette } from "./palette.js";
import { hexFor, solveL } from "./solve.js";
import type { BrandVector } from "./types.js";

export interface DerivedTheme {
  mode: "light" | "dark";
  customerTheme: CustomerTheme;
  resolved: ResolvedTheme;
  customProperties: Record<string, string>;
}

export interface DerivedPair {
  vector: BrandVector;
  light: DerivedTheme;
  dark: DerivedTheme;
}

/** camelCase token name → --psi-kebab-case custom property. */
function cssName(token: string): string {
  return `--psi-${token.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
}

const BASE_TARGET = 4.5;
const TARGET_ESCALATION = 0.1;
const MAX_ATTEMPTS = 24;

/**
 * Per-hue overrides that keep the AA matrix clean, in exactly the shape acme
 * carries by hand (`acmeOverrides`). Text tokens force their own L in the base
 * themes, so the free variables here are that L and the chroma cap.
 *
 * Solving each text token to exactly 4.5:1 against the canvas is not enough:
 * `wcagAAPairs` also gates the SAME foreground against its own tint fill
 * (`fillTintAccent` etc.) — canvas tinted 12–15% toward the very colour being
 * tested — and, for the status tokens, against `bgSecondary`. Both are
 * strictly harder than plain canvas contrast (the tint background is closer
 * in colour to the foreground than the canvas is), so a token solved to land
 * exactly on the canvas threshold lands *under* AA on those pairs — this is
 * what the initial `it.each` sweep caught (5 prompts, both text-on-canvas and
 * text-on-tint failures, e.g. `fgAccent/fillTintAccent 3.88<4.5`). The fix
 * solves against the REAL resolved theme's own AA pairs for this token, not
 * an approximated canvas swatch, and escalates the target and retries when a
 * pair it doesn't directly parameterize (the tint, bgSecondary) still fails.
 */
function solveOverrides(palette: Palette, slots: SlotMap, mode: "light" | "dark"): ThemeDef {
  const canvas = palette[slots.canvas]!;
  const canvasHex = hexFor(canvas.l, canvas.c, canvas.h);
  const direction = mode === "light" ? "darker" : "lighter";

  const overrides: ThemeDef = {};

  // Text-on-canvas tokens: solve L per slot, then cap chroma at what that hue
  // can actually carry at the solved L.
  //
  // The second element is the SLOT name ("accent"), not the palette key
  // ("brandAccent") — `slot.accent` is what a TokenDef sources from, while the
  // anchor is looked up through `slots` to reach the palette entry.
  const textTokens = [
    ["fgAccent", "accent"],
    ["fgSuccess", "success"],
    ["fgWarning", "warning"],
    ["fgDanger", "danger"],
  ] as const;

  for (const [name, slotName] of textTokens) {
    const anchor = palette[slots[slotName]]!;
    // Every wcagAAPairs entry that gates THIS foreground — canvas for all
    // four, plus fillTintX for all four, plus bgSecondary for the three
    // status tokens (fgAccent has no bgSecondary entry).
    const relevantPairs = wcagAAPairs.filter((p) => p.fg === name);

    let candidate: TokenDef | undefined;
    let lastFailures: string[] = [];

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const target = BASE_TARGET + attempt * TARGET_ESCALATION;

      // Solve lightness at the anchor's own chroma. When `cleared` is false
      // the target is unreachable at that chroma, and chroma is the lever
      // that makes a saturated hue reachable — so reduce it and re-solve.
      // This is exactly what acme's hand-tuned caps (`acmeOverrides`) do by
      // hand.
      //
      // Reading `.cleared` is not optional: `solveL` returns its most
      // legible available value when it gives up, so ignoring the flag
      // would ship a below-AA colour that looks like a solved one.
      let c = anchor.c;
      let solved = solveL({ c, h: anchor.h, against: canvasHex, target, direction });
      while (!solved.cleared && c > 0) {
        c = Math.max(0, c - 0.008);
        solved = solveL({ c, h: anchor.h, against: canvasHex, target, direction });
      }
      if (!solved.cleared) {
        throw new Error(
          `solveOverrides: ${name} cannot clear ${target}:1 against ${canvasHex} at any chroma`,
        );
      }

      candidate = token({
        from: slot[slotName],
        l: set(Number(solved.l.toFixed(4))),
        c: cap(Number(c.toFixed(4))),
        scopes: ["text"],
      });

      // Verify against the REAL resolved theme, not the canvas approximation
      // above: `against: canvasHex` only stands in for bgPrimary (which in
      // dark mode overrides L/C directly rather than reading the palette
      // entry) and cannot see fillTintX/bgSecondary at all, since both are
      // themselves formulas over this very token.
      const trialResolved = resolve(
        assembleCustomerTheme({
          palette,
          slots,
          base: mode,
          overrides: { ...overrides, [name]: candidate },
        }),
        palette,
        slots,
      );
      const failures = checkContrast(trialResolved, relevantPairs).filter((r) => !r.pass);
      if (failures.length === 0) {
        lastFailures = [];
        break;
      }
      lastFailures = failures.map((f) => `${f.fg}/${f.bg} ${f.ratio}<${f.minRatio}`);
    }

    if (lastFailures.length > 0) {
      throw new Error(
        `solveOverrides: ${name} still fails after ${MAX_ATTEMPTS} escalations: ${lastFailures.join(", ")}`,
      );
    }

    overrides[name] = candidate!;
  }

  return overrides;
}

function deriveMember(
  v: BrandVector,
  palette: Palette,
  slots: SlotMap,
  mode: "light" | "dark",
): DerivedTheme {
  const customerTheme: CustomerTheme = {
    palette,
    slots,
    base: mode,
    overrides: solveOverrides(palette, slots, mode),
    ...(v.fonts ? { fonts: v.fonts } : {}),
    componentOverrides: { "control-radius": `var(--psi-radius-${v.radius})` },
  };

  const resolved = resolve(assembleCustomerTheme(customerTheme), palette, slots);

  const customProperties: Record<string, string> = {};
  for (const [name, tok] of Object.entries(resolved)) {
    customProperties[cssName(name)] = tok.hex;
  }
  for (const [name, value] of Object.entries(customerTheme.componentOverrides ?? {})) {
    customProperties[`--psi-${name}`] = value;
  }

  return { mode, customerTheme, resolved, customProperties };
}

/**
 * Derive both members of a brand from one vector, each solved to AA
 * independently (D57). The header toggle then selects between them — there is
 * nothing left to recompute.
 */
export function deriveTheme(v: BrandVector): DerivedPair {
  const { palette, lightSlots, darkSlots } = buildBrandPalette(v);

  const pair: DerivedPair = {
    vector: v,
    light: deriveMember(v, palette, lightSlots, "light"),
    dark: deriveMember(v, palette, darkSlots, "dark"),
  };

  // Belt and braces: the solver targets the text pairs directly, but the AA
  // matrix covers more than those. A residual failure means a bug in the
  // solver, not bad input, so surface it loudly in development.
  for (const member of [pair.light, pair.dark]) {
    const failures = checkContrast(member.resolved, wcagAAPairs).filter((r) => !r.pass);
    if (failures.length > 0) {
      throw new Error(
        `deriveTheme: ${member.mode} left ${failures.length} AA failure(s): ` +
          failures.map((f) => `${f.fg}/${f.bg} ${f.ratio}<${f.minRatio}`).join(", "),
      );
    }
  }

  return pair;
}
