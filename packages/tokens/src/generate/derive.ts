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

/** The channels of `hex` with an exact alpha. checkContrast composites
 * tok.hex (gamut-clamped, 8-bit per channel) with the unrounded alpha, so
 * this is the only form that renders precisely what was validated. hex8
 * cannot: it quantizes alpha to 1/255, which moves the composited result a
 * full channel step and drops near-threshold pairs below 4.5 (measured: 384
 * of 1225 sampled prompts had a pair render under AA with hex8). Deliberately
 * not `oklch(l c h / a)` either — the browser would recompute RGB from OKLCH
 * and could land a bit away from `formatHex`'s own rounding, reintroducing
 * the same class of mismatch between what was validated and what renders. */
function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

const BASE_TARGET = 4.5;
const TARGET_ESCALATION = 0.1;
const MAX_OUTER_ATTEMPTS = 40;

/** The four text tokens this function solves, mapped to the palette slot
 * their colour anchors on. The second element is the SLOT name ("accent"),
 * not the palette key ("brandAccent") — `slot.accent` is what a TokenDef
 * sources from, while the anchor is looked up through `slots` to reach the
 * palette entry. */
const TEXT_TOKENS = [
  ["fgAccent", "accent"],
  ["fgSuccess", "success"],
  ["fgWarning", "warning"],
  ["fgDanger", "danger"],
] as const;

/** bg token name → the text token whose colour it derives from (light.ts /
 * dark.ts: `fillTintAccent: token({ from: ref.fgAccent, ... })`, etc). Lets
 * the escalation loop trace a failing pair like `{ fg: "fgPrimary", bg:
 * "fillTintAccent" }` (the D62 selected-row pair) back to the token that
 * actually controls it, even though that token appears nowhere in the pair
 * itself. */
const TINT_SOURCE: Readonly<Record<string, string>> = {
  fillTintAccent: "fgAccent",
  fillTintSuccess: "fgSuccess",
  fillTintWarning: "fgWarning",
  fillTintDanger: "fgDanger",
};

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
 * text-on-tint failures, e.g. `fgAccent/fillTintAccent 3.88<4.5`).
 *
 * The accept/reject gate for the whole function is the FULL `wcagAAPairs`
 * sweep against the real resolved theme, not a per-token subset: a per-token
 * filter (`p.fg === name`) is blind to cross pairs whose `bg` a token
 * controls indirectly but whose `fg` is something else — e.g. `{ fg:
 * "fgPrimary", bg: "fillTintAccent" }` (D62) is only visible once
 * `fillTintAccent`'s own dependency on `fgAccent` is traced via
 * `TINT_SOURCE`. Solving each token in isolation and declaring victory once
 * IT is happy would leave that pair free to fail with no one watching. Each
 * outer pass solves all four tokens at their current targets, resolves the
 * real theme, and checks every pair in `wcagAAPairs`; any failure escalates
 * the target of whichever token owns it (traced through `TINT_SOURCE` when
 * the failure isn't already `fg === token`) and the whole thing is retried.
 * The loop cannot return successfully while any pair in the matrix fails —
 * it either converges within `MAX_OUTER_ATTEMPTS` or throws.
 */
function solveOverrides(palette: Palette, slots: SlotMap, mode: "light" | "dark"): ThemeDef {
  const canvas = palette[slots.canvas]!;
  const canvasHex = hexFor(canvas.l, canvas.c, canvas.h);
  const direction = mode === "light" ? "darker" : "lighter";

  // Solve a single text token's L/chroma against a given canvas-contrast
  // target. Reduces chroma and re-solves when the target is unreachable at
  // the anchor's own chroma — exactly what acme's hand-tuned caps
  // (`acmeOverrides`) do by hand. Reading `.cleared` is not optional:
  // `solveL` returns its most legible available value when it gives up, so
  // ignoring the flag would ship a below-AA colour that looks like a solved
  // one.
  function solveOne(slotName: string, target: number): TokenDef {
    const anchor = palette[slots[slotName as keyof SlotMap]]!;
    let c = anchor.c;
    let solved = solveL({ c, h: anchor.h, against: canvasHex, target, direction });
    while (!solved.cleared && c > 0) {
      c = Math.max(0, c - 0.008);
      solved = solveL({ c, h: anchor.h, against: canvasHex, target, direction });
    }
    if (!solved.cleared) {
      throw new Error(
        `solveOverrides: ${slotName} cannot clear ${target}:1 against ${canvasHex} at any chroma`,
      );
    }
    return token({
      from: slot[slotName],
      l: set(Number(solved.l.toFixed(4))),
      c: cap(Number(c.toFixed(4))),
      scopes: ["text"],
    });
  }

  const targets: Record<string, number> = {};
  for (const [name] of TEXT_TOKENS) targets[name] = BASE_TARGET;

  let overrides: ThemeDef = {};
  let lastFailures: string[] = [];

  for (let outer = 0; outer < MAX_OUTER_ATTEMPTS; outer++) {
    overrides = {};
    for (const [name, slotName] of TEXT_TOKENS) {
      overrides[name] = solveOne(slotName, targets[name]!);
    }

    const trialResolved = resolve(
      assembleCustomerTheme({ palette, slots, base: mode, overrides }),
      palette,
      slots,
    );
    const failures = checkContrast(trialResolved, wcagAAPairs).filter((r) => !r.pass);
    if (failures.length === 0) {
      lastFailures = [];
      break;
    }

    lastFailures = failures.map((f) => `${f.fg}/${f.bg} ${f.ratio}<${f.minRatio}`);

    let escalatedAny = false;
    for (const f of failures) {
      const owner = f.fg in targets ? f.fg : TINT_SOURCE[f.bg];
      if (owner !== undefined && owner in targets) {
        targets[owner] = targets[owner]! + TARGET_ESCALATION;
        escalatedAny = true;
      }
    }
    // A failing pair this loop cannot trace to any of the four tokens it
    // controls (fg isn't one of them, bg isn't a tint of one of them) is not
    // something escalating a target will ever fix — retrying would just burn
    // the remaining attempts for no reason, so give up immediately with the
    // specific failures rather than a generic "still fails" after 40 no-op
    // attempts.
    if (!escalatedAny) {
      throw new Error(
        `solveOverrides: failure(s) outside the four solved tokens' control: ${lastFailures.join(", ")}`,
      );
    }
  }

  if (lastFailures.length > 0) {
    throw new Error(
      `solveOverrides: still fails after ${MAX_OUTER_ATTEMPTS} escalations: ${lastFailures.join(", ")}`,
    );
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
    // tok.hex is always opaque — formatHex discards alpha. Tokens like
    // fillTint* and the scrims carry alpha, and dropping it makes them
    // byte-identical to the token they derive from (e.g. fillTintAccent
    // would render as fgAccent at full strength): checkContrast composites
    // alpha correctly, so the AA sweep would still pass while the shipped
    // custom property renders the guarantee false in the browser. `withAlpha`
    // carries the exact float alpha checkContrast validated against — see its
    // own comment for why hex8 (1/255 alpha quantization) isn't safe here.
    const alpha = tok.oklch.alpha;
    customProperties[cssName(name)] =
      alpha === undefined || alpha >= 1 ? tok.hex : withAlpha(tok.hex, alpha);
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
