# Site-Scale & Portfolio Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement spec `docs/superpowers/specs/2026-07-09-site-scale-and-portfolio-readiness-spec.md` (D27–D36): dark-first brands + ember theme, font roles + display tier, motion tokens, layout/viewport tokens, Button href/outline + Card/NavBar/AspectRatio + icons, and the portfolio/promo consumer pilot.

**Architecture:** All token changes flow through the existing formula DSL → codegen pipeline in `packages/tokens` (one resolver feeds CSS, JSON, DTCG, types, docs). Components follow the established per-folder pattern in `packages/react` with component-token-only module CSS enforced by stylelint. The portfolio consumes vendored generated CSS only (no build step).

**Tech Stack:** TypeScript, tsx, culori, vitest, React 19, CSS Modules, Vite, Storybook 9, pnpm workspace, changesets.

**Repos:** DS monorepo `~/Projects/dku/ds` (branch `site-scale-portfolio-readiness`), portfolio `~/Projects/dku/portfolio` (branch `ds-tokens-pilot`, created in Milestone 6).

## Global Constraints

- Browser floor: Chrome/Edge 119+, Safari 18+, Firefox 128+ (OKLCH relative color with `var()` in `from` position). Never emit fallbacks for older browsers.
- Pixel-true names, rem values (D13): `--ds-space-96` = 6rem; display combos named by clamp endpoints `--ds-display-{min}-{max}-{weight}` (D28).
- The DS ships **no font files** (D29) and **no keyframes** (WS3 non-goal). Roles, durations, easings only.
- Reduced motion = zero `--ds-duration-*` under `prefers-reduced-motion: reduce` in `utilities.css` (D30).
- Breakpoints are build-time constants exported from `@handamade/tokens`, baked into emitted media queries (D31).
- Scrim tokens are surfaces, exempt from the AA text gate (D32) — they are simply never declared as text pairs.
- D33 guardrail: disabled anchors must be **non-focusable** and must **suppress activation** (`aria-disabled="true"`, no `href` attribute, `pointer-events: none`).
- D34 guardrail: only documented component tokens are overrideable; overrides must not break accessibility, sizing contracts, or interaction states.
- Component module CSS may reference only `--ds-{component}-*` and scale tokens (stylelint `ds/component-tokens-only`); semantic-token binding happens only in `packages/tokens/src/components/*.ts`.
- Quality gates (spec end) are **blocking per milestone**: build green, contrast gate (light/dark/acme/**ember**), stylelint, Storybook, regenerated artifacts, changeset, pilot verification.
- Commit per task. Conventional-commit style messages, matching existing history.
- Portfolio repo rule: append a dated activity-log entry to its `AGENTS.md` before finishing work there.

## Pre-approved deviations & new decision (confirm at plan review)

1. **Working branch base.** `site-scale-portfolio-readiness` is branched off `remediation-ai-readability`, not `main`: `main` lacks `apps/promo`, the customer-theme registry, guidance/DTCG emitters, and this spec itself (all landed on `remediation-ai-readability`, which is a strict superset of `main` — 32 ahead, 0 behind).
2. **D37 (proposed): semantic `fgOnAccent` label token.** The existing gate pair `fgStaticWhite on fillAccent` fails for ember at **2.62** (white on `#ff7847`). The spec's fallback ("adjust `emberAccent` L minimally") is mathematically impossible: white needs L ≤ ~0.58 vs the brand's 0.724 — that destroys `#ff7847`, and the portfolio never renders white-on-ember anyway (its CTA hover is *dark* text on ember, ratio **6.12** ✓). Fix at the system level: new semantic token `fgOnAccent` (light/dark default: alias of `fgStaticWhite`; ember overrides to `fgStaticBlack`'s formula). `button/tag accent-fg` and `checkbox check-fg` rebind to it; the gate pair becomes `(fgOnAccent, fillAccent)`. Switch `thumb-bg` stays `fgStaticWhite` (the thumb also sits on the *unchecked* neutral track, where a dark thumb would vanish in dark themes; it is not a text label).
3. **Outline hover label.** The spec's literal "canvas label" (`fgPrimaryInverted`) on `fillAccent` fails AA in default light (**4.35**) and dark (**3.92**). The outline variant's hover label binds to `var(--ds-button-accent-fg)` (→ `fgOnAccent`), which passes everywhere (light/dark 5.02, acme 5.36, ember 6.12) and matches the portfolio CTA exactly under ember.
4. **Ember overrides beyond `bgSecondary`.** Inherited dark formulas give `bgPrimary` `#0e0b07` and `bgSecondary` `#1a150f` (visibly light/olive vs targets). Canvas-anchor overrides land **exactly** on the shipped hexes: `bgPrimary` = `#0c0a09`, `bgSecondary` = `#100d0b`, `fgPrimary` = `#f3ede6`. Same mechanism the spec prescribes, applied to three tokens instead of one.
5. **Portfolio branch base.** `ds-tokens-pilot` branches off `docs/agents-md` (not `main`): AGENTS.md exists only there, and the pilot must follow + update it.
6. **Component-var specificity.** To make D34 brand overrides win, `components.css` selectors change from `:root, [data-ds-theme]` to `:where(:root, [data-ds-theme])` (zero specificity); brand component overrides are emitted into `@layer ds.components` inside the brand's theme file at `[data-ds-theme="<name>"]` specificity. Without this, layer order (`ds.components` after `ds.theme`) silently defeats every brand override.
7. **Promo normalizations.** Adopting DS tokens visibly changes promo: container 1120→1312px, hero display clamp(42→76) → `--ds-display-36-64-black`, h2 clamp(26→38) → static 32px, `--promo-ease` → `--ds-ease-soft`, rise 0.7s → 600ms. Accepted as the cost of deduplication (spec WS6); before/after screenshots archived.

## File structure (created ▸ / modified ▹)

```
packages/tokens/
  src/scales/typography.ts        ▹ weights, roles, serif/mono combos, display tier
  src/scales/motion.ts            ▸ durations + easings
  src/scales/layout.ts            ▸ breakpoints, container, zIndex
  src/scales/spacing.ts           ▹ + 96, 120, 144
  src/themes/light.ts, dark.ts    ▹ fgOnAccent, borderFaint, scrims
  src/themes/customers/index.ts   ▹ base/fonts/componentOverrides + assembleCustomerTheme
  src/themes/customers/ember.ts   ▸ the ember brand
  src/components/{button,tag,checkbox}.ts ▹ fgOnAccent rebind; button outline + font
  src/components/card.ts          ▸  src/components/navbar.ts ▸  src/components/media.ts ▸
  src/contrast-matrix.ts          ▹ label-pair swap
  src/guidance.ts                 ▹ fonts/motion/layout/display/recipes
  scripts/{build,new-theme,emit-css,emit-utilities,emit-json,emit-dtcg,emit-types,emit-components}.ts ▹
  __tests__/ember-theme.test.ts   ▸ (+ edits to scales, themes, contrast, emit-*, registry tests)
packages/react/src/
  Button/*, IconButton/*          ▹ href + outline + --ds-button-font
  Card/* ▸  NavBar/* ▸  AspectRatio/* ▸
  icons/Icon{ArrowDown,ArrowUpRight,LinkedIn,GitHub,X,Instagram}.tsx ▸
  Tooltip/tooltip.module.css      ▹ z token   (+ index.ts, icons/index.ts ▹)
  scripts/emit-manifest.ts        ▹ + Card, NavBar, AspectRatio
tools/stylelint-plugin-ds-tokens.mjs ▹ duration/ease/z allowance + literal checks
apps/storybook/  preview.ts, token-reader.ts ▹; token-docs/{Motion,Layout,Display}Tokens.stories.tsx ▸
apps/promo/src/promo.css          ▹ WS6 migration
~/Projects/dku/portfolio/         ▹ vendor/dku-tokens/, index.html, AGENTS.md
docs/superpowers/plans/assets/2026-07-09-site-scale/  ▸ screenshots
```

Verification commands used throughout (run from `~/Projects/dku/ds`):

```bash
pnpm --filter @handamade/tokens build      # codegen + contrast gate (throws on failure)
pnpm test                            # vitest workspace
pnpm lint:css                        # stylelint token rule
pnpm build                           # full workspace build
```

---

# Milestone 1 — WS1: Dark-first brands + ember (D27, D37)

### Task 1: `CustomerTheme.base` + `assembleCustomerTheme()`

**Files:**
- Modify: `packages/tokens/src/themes/customers/index.ts`
- Modify: `packages/tokens/scripts/build.ts:40-46`
- Test: `packages/tokens/__tests__/customer-theme-registry.test.ts`

**Interfaces:**
- Produces: `CustomerTheme.base?: "light" | "dark"`; `assembleCustomerTheme(c: CustomerTheme): ThemeDef` — used by build.ts and every later theme test.

- [ ] **Step 1: Write the failing tests** — append to `customer-theme-registry.test.ts`:

```ts
import { assembleCustomerTheme } from "../src/themes/customers/index.js";
import { acmePalette, acmeSlots } from "../src/themes/customers/acme.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { token, slot } from "../src/dsl/builders.js";

describe("dark-first customer themes (D27)", () => {
  it("assembles over lightTheme by default", () => {
    const def = assembleCustomerTheme({ palette: acmePalette, slots: acmeSlots });
    expect(def.bgPrimary).toEqual(lightTheme.bgPrimary);
  });

  it("assembles over darkTheme when base is 'dark'", () => {
    const def = assembleCustomerTheme({ palette: acmePalette, slots: acmeSlots, base: "dark" });
    expect(def.bgPrimary).toEqual(darkTheme.bgPrimary);
    expect(def.fgPrimary).toEqual(darkTheme.fgPrimary);
  });

  it("merges overrides over the dark base", () => {
    const overrides = { bgPrimary: token({ from: slot.canvas }) };
    const def = assembleCustomerTheme({ palette: acmePalette, slots: acmeSlots, base: "dark", overrides });
    expect(def.bgPrimary).toEqual(overrides.bgPrimary);
    expect(def.bgSecondary).toEqual(darkTheme.bgSecondary);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `pnpm vitest run packages/tokens/__tests__/customer-theme-registry.test.ts` → FAIL: `assembleCustomerTheme` is not exported.

- [ ] **Step 3: Implement** — in `customers/index.ts` (imports: add `ThemeDef` type import already present; add theme imports):

```ts
import type { Palette, SlotMap, ThemeDef } from "../../dsl/types.js";
import { lightTheme } from "../light.js";
import { darkTheme } from "../dark.js";
import { acmePalette, acmeSlots } from "./acme.js";

export interface CustomerTheme {
  palette: Palette;
  slots: SlotMap;
  /** Which default theme the brand's formulas build on (D27). Default: "light". */
  base?: "light" | "dark";
  /** Optional semantic-token formula overrides, merged over the base theme. */
  overrides?: ThemeDef;
}

/** Assemble the full semantic ThemeDef for a customer brand (D27). */
export function assembleCustomerTheme(c: CustomerTheme): ThemeDef {
  const base = c.base === "dark" ? darkTheme : lightTheme;
  return { ...base, ...c.overrides };
}
```

In `build.ts`, import `assembleCustomerTheme` from `../src/themes/customers/index.js` and change the customer mapping to:

```ts
  ...Object.fromEntries(Object.entries(customerThemes).map(([name, c]) => [
    name, { theme: assembleCustomerTheme(c), palette: c.palette, slots: c.slots },
  ])),
```

- [ ] **Step 4: Verify** — rerun the test file → PASS; `pnpm --filter @handamade/tokens build` → green (acme unchanged).
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(tokens): customer themes declare base light|dark (D27)"`

### Task 2: `new-theme --base dark` scaffolder

**Files:** Modify: `packages/tokens/scripts/new-theme.ts`

No unit test — the scaffolder is an interactive script with no test harness (existing convention); verified by running it and inspecting output, then reverting.

- [ ] **Step 1: Implement.** Replace the argv handling (lines 4–8) with:

```ts
const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--"));
const baseIdx = args.indexOf("--base");
const base = baseIdx !== -1 ? args[baseIdx + 1] : "light";
if (!name) {
  console.error("Usage: pnpm new-theme <name> [--base dark]");
  process.exit(1);
}
if (base !== "light" && base !== "dark") {
  console.error(`--base must be "light" or "dark", got "${base}"`);
  process.exit(1);
}
```

In the template string, replace the first line of the palette comment block so the generated file states its base, and give dark brands dark-appropriate starting anchors. Replace the palette section of `template` with:

```ts
const anchors = base === "dark"
  ? `  // Dark-first brand (D27): formulas build on darkTheme.
  // ink = the brand's LIGHT text anchor, canvas = the DARK page anchor —
  // dark formulas force L per token, so hue/chroma carry the brand.
  ${name}Ink: { l: 0.95, c: 0.01, h: 250 },
  ${name}Canvas: { l: 0.15, c: 0.005, h: 250 },
  ${name}Brand: { l: 0.7, c: 0.18, h: 260 },`
  : `  // Base theme: light (D27). Replace with brand OKLCH anchors.
  ${name}Ink: { l: 0.25, c: 0.02, h: 250 },
  ${name}Canvas: { l: 0.95, c: 0.005, h: 250 },
  ${name}Brand: { l: 0.55, c: 0.21, h: 260 },`;
```

and interpolate `${anchors}` where the three anchor lines were. Registration line becomes:

```ts
const registrationLine = `  ${name}: { palette: ${name}Palette, slots: ${name}Slots${base === "dark" ? ', base: "dark"' : ""} },\n`;
```

- [ ] **Step 2: Verify both paths:**

```bash
cd packages/tokens
pnpm new-theme zzzdark --base dark && grep -n 'base: "dark"' src/themes/customers/index.ts && grep -n "Dark-first" src/themes/customers/zzzdark.ts
pnpm new-theme zzzlight && grep -n "zzzlight: { palette" src/themes/customers/index.ts
git checkout -- src/themes/customers/index.ts && rm src/themes/customers/zzz{dark,light}.ts
```

Expected: both greps match; cleanup leaves tree clean (`git status --short` empty).

- [ ] **Step 3: Commit** — `git commit -am "feat(tokens): new-theme --base dark scaffolds dark-first brands (D27)"`

### Task 3: `fgOnAccent` semantic token (D37)

**Files:**
- Modify: `packages/tokens/src/themes/light.ts`, `src/themes/dark.ts`, `src/contrast-matrix.ts:149-154`, `src/components/button.ts`, `src/components/tag.ts`, `src/components/checkbox.ts`
- Test: `packages/tokens/__tests__/contrast.test.ts`, `__tests__/light-theme.test.ts`, `__tests__/dark-theme.test.ts`, `__tests__/button-tokens.test.ts`

**Interfaces:**
- Produces: semantic token `fgOnAccent` (`--ds-fg-on-accent`) in every theme; gate pair `(fgOnAccent, fillAccent, 4.5)`. Task 4 (ember) and Task 18 (outline) depend on it.

- [ ] **Step 1: Failing test** — add to `contrast.test.ts` (inside the existing describe, following its resolve pattern):

```ts
it("fgOnAccent passes on fillAccent in light, dark, and acme", () => {
  const themes = [
    resolve(lightTheme, defaultPalette, defaultSlots),
    resolve(darkTheme, defaultPalette, defaultSlots),
    resolve({ ...lightTheme }, acmePalette, acmeSlots),
  ];
  for (const resolved of themes) {
    const [r] = checkContrast(resolved, [{ fg: "fgOnAccent", bg: "fillAccent", minRatio: 4.5 }]);
    expect(r.pass, `ratio ${r.ratio}`).toBe(true);
  }
});
```

- [ ] **Step 2: Run** — `pnpm vitest run packages/tokens/__tests__/contrast.test.ts` → FAIL: Unknown foreground token "fgOnAccent".

- [ ] **Step 3: Implement.** In **both** `light.ts` and `dark.ts`, after the `fgStaticBlack` line:

```ts
  /** Label ink on fillAccent (D37). Brands whose accent can't carry white
   * (e.g. ember #ff7847, white = 2.62:1) override this instead of mangling
   * their anchor. */
  fgOnAccent: token({ from: ref.fgStaticWhite }),
```

In `contrast-matrix.ts`, replace the first `componentLabelPairs` entry:

```ts
  { fg: "fgOnAccent", bg: "fillAccent", minRatio: 4.5 },     // Button/IconButton/Tag accent label, Checkbox check, outline hover (D37)
```

Rebind in component token files: `button.ts` `"accent-fg": "var(--ds-fg-on-accent)"`; `tag.ts` `"accent-fg": "var(--ds-fg-on-accent)"`; `checkbox.ts` `"check-fg": "var(--ds-fg-on-accent)"`. **Leave `switch.ts thumb-bg` as `fgStaticWhite`** — the thumb also sits on the unchecked neutral track (not a label; a dark thumb vanishes on dark tracks).

- [ ] **Step 4: Fix ripple + verify.** Update token-name expectations in `light-theme.test.ts` / `dark-theme.test.ts` (add `fgOnAccent` wherever the token list is asserted) and the `accent-fg` value in `button-tokens.test.ts`. Then `pnpm vitest run packages/tokens && pnpm --filter @handamade/tokens build` → all PASS, gate green.
- [ ] **Step 5: Commit** — `git commit -am "feat(tokens): fgOnAccent semantic label token; gate follows actual bindings (D37)"`

### Task 4: The ember brand

**Files:**
- Create: `packages/tokens/src/themes/customers/ember.ts`
- Modify: `packages/tokens/src/themes/customers/index.ts` (registration)
- Create: `packages/tokens/__tests__/ember-theme.test.ts`
- Modify: `apps/storybook/.storybook/preview.ts`, `apps/storybook/src/token-docs/token-reader.ts`

- [ ] **Step 1: Failing test** — `__tests__/ember-theme.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolve } from "../src/dsl/resolver.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import { checkContrast, wcagAAPairs, componentLabelPairs } from "../src/contrast-matrix.js";

describe("ember brand (WS1)", () => {
  const ember = customerThemes.ember;

  it("is registered dark-first", () => {
    expect(ember).toBeDefined();
    expect(ember.base).toBe("dark");
  });

  const resolved = () => resolve(assembleCustomerTheme(ember), ember.palette, ember.slots);

  it("lands exactly on the shipped portfolio surfaces", () => {
    const r = resolved();
    expect(r.bgPrimary.hex).toBe("#0c0a09");
    expect(r.bgSecondary.hex).toBe("#100d0b");
    expect(r.fgPrimary.hex).toBe("#f3ede6");
  });

  it("passes the full AA gate (regression: dark-based customers are gated)", () => {
    const results = checkContrast(resolved(), [...wcagAAPairs, ...componentLabelPairs]);
    expect(results.filter((r) => !r.pass)).toEqual([]);
  });

  it("uses a dark accent label (D37): white would fail on the ember accent", () => {
    const r = resolved();
    const [onAccent] = checkContrast(r, [{ fg: "fgOnAccent", bg: "fillAccent", minRatio: 4.5 }]);
    const [white] = checkContrast(r, [{ fg: "fgStaticWhite", bg: "fillAccent", minRatio: 4.5 }]);
    expect(onAccent.pass).toBe(true);
    expect(white.pass).toBe(false);
  });
});
```

- [ ] **Step 2: Run** — FAIL: `customerThemes.ember` undefined.

- [ ] **Step 3: Implement** — `ember.ts`:

```ts
import { token, delta, slot, ref } from "../../dsl/builders.js";
import type { Palette, SlotMap, ThemeDef } from "../../dsl/types.js";

/** Dark-first brand (D27) — the portfolio's ember-field identity.
 * Anchors are culori-derived from the shipped portfolio hexes. */
export const emberPalette: Palette = {
  emberCanvas: { l: 0.147, c: 0.004, h: 49 },  // #0c0a09 page
  emberInk: { l: 0.949, c: 0.011, h: 72 },     // #f3ede6 text
  emberAccent: { l: 0.724, c: 0.177, h: 40 },  // #ff7847
  emberEmerald: { l: 0.52, c: 0.19, h: 155 },  // default success anchor values
  emberAmber: { l: 0.75, c: 0.18, h: 75 },     // default warning anchor values
  emberRuby: { l: 0.55, c: 0.22, h: 25 },      // default danger anchor values
  white: { l: 1.0, c: 0, h: 0 },
  black: { l: 0.0, c: 0, h: 0 },
};

export const emberSlots: SlotMap = {
  ink: "emberInk",
  canvas: "emberCanvas",
  accent: "emberAccent",
  success: "emberEmerald",
  warning: "emberAmber",
  danger: "emberRuby",
};

export const emberOverrides: ThemeDef = {
  // Inherited dark formulas land off-target (#0e0b07 / #1a150f / #eee6e2);
  // canvas/ink-anchor overrides hit the shipped hexes exactly.
  bgPrimary: token({ from: slot.canvas }),                                    // #0c0a09
  bgSecondary: token({ from: slot.canvas, l: delta(+0.015), c: delta(+0.003) }), // #100d0b
  fgPrimary: token({ from: slot.ink }),                                       // #f3ede6
  // Dark label on the ember accent (D37): white is 2.62:1 on #ff7847.
  fgOnAccent: token({ from: ref.fgStaticBlack }),
};
```

Registration in `customers/index.ts` (above the `<ds:register>` marker; add the import at top):

```ts
import { emberPalette, emberSlots, emberOverrides } from "./ember.js";
// … inside customerThemes:
  ember: { palette: emberPalette, slots: emberSlots, base: "dark", overrides: emberOverrides },
```

- [ ] **Step 4: Verify** — `pnpm vitest run packages/tokens/__tests__/ember-theme.test.ts` → PASS. `pnpm --filter @handamade/tokens build` → `contrast check passed for ember`, `wrote dist/ember.css`. If any pair fails, the build prints the pair and actual ratio — fix formula, don't relax the gate.

- [ ] **Step 5: Storybook wiring.** `preview.ts`: add `import "@handamade/tokens/ember.css";` and toolbar item `{ value: "ember", title: "Ember", icon: "flame" }`. `token-reader.ts`: add `import resolvedEmber from "@handamade/tokens/resolved/ember.json";`, extend `ThemeName` with `"ember"`, add `ember: resolvedEmber as ResolvedTheme` to `RESOLVED`.

- [ ] **Step 6: Verify + commit** — `pnpm build && pnpm test` green; `git commit -am "feat(tokens): ember dark-first brand, gated (WS1, D27, D37)"`

**Milestone 1 gate:** `pnpm build` (contrast passes light/dark/acme/ember) · `pnpm test` · `pnpm lint`.

---

# Milestone 2 — WS2: Typography (roles, weights, display, serif/mono)

### Task 5: Weights `extrabold`/`black`

**Files:** Modify `packages/tokens/src/scales/typography.ts:1-4`; test `__tests__/scales.test.ts`

- [ ] **Step 1: Failing test** (scales.test.ts, typography describe):

```ts
it("maps extended weights (WS2)", () => {
  expect(WEIGHT_VALUES.extrabold).toBe(800);
  expect(WEIGHT_VALUES.black).toBe(900);
});
```

(import `WEIGHT_VALUES` from `../src/scales/typography.js`.)

- [ ] **Step 2: Run** → FAIL (property undefined / type error).
- [ ] **Step 3: Implement:**

```ts
export type Weight = "regular" | "medium" | "semibold" | "bold" | "extrabold" | "black";
export const WEIGHT_VALUES: Record<Weight, number> = {
  regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900,
};
```

- [ ] **Step 4: Verify** → PASS. **Step 5: Commit** `feat(tokens): extrabold/black weights (WS2)`.

### Task 6: Font roles `--ds-font-serif` / `--ds-font-display`

**Files:** Modify `packages/tokens/scripts/emit-utilities.ts:50-57`; test `__tests__/scales.test.ts`

- [ ] **Step 1: Failing test:**

```ts
it("emits serif and display font roles (WS2, D29)", () => {
  const css = emitScaleVarsCSS();
  expect(css).toContain(`--ds-font-serif: Georgia, "Times New Roman", Times, serif;`);
  expect(css).toContain(`--ds-font-display: var(--ds-font-sans);`);
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** — after the existing `--ds-font-mono` push in `emitScaleVarsCSS`:

```ts
  lines.push(`    --ds-font-serif: Georgia, "Times New Roman", Times, serif;`);
  lines.push(`    --ds-font-display: var(--ds-font-sans);`);
```

- [ ] **Step 4: Verify** → PASS; build green. **Step 5: Commit** `feat(tokens): serif + display font role vars (D29)`.

### Task 7: Combo roles + serif/mono combos

**Files:** Modify `packages/tokens/src/scales/typography.ts`, `scripts/emit-utilities.ts:44-47,106-109`, `scripts/emit-dtcg.ts:33-37`; test `__tests__/scales.test.ts`

**Interfaces:**
- Produces: `TypographyCombo.role?: "sans" | "serif" | "mono"`; `comboName` prefixes non-sans roles (`serif-18-28-regular`); `comboFontVar(c)` → `--ds-font-{role}`. WS6 consumes `--ds-text-serif-*` / `--ds-text-mono-*`.

- [ ] **Step 1: Failing tests:**

```ts
it("prefixes non-sans combo names with their role (WS2)", () => {
  expect(comboName({ fontSize: 18, lineHeight: 28, weight: "regular", role: "serif" })).toBe("serif-18-28-regular");
  expect(comboName({ fontSize: 16, lineHeight: 24, weight: "regular" })).toBe("16-24-regular");
  expect(comboName({ fontSize: 16, lineHeight: 24, weight: "regular", role: "sans" })).toBe("16-24-regular");
});

it("emits serif/mono combos against their role font var", () => {
  const css = emitScaleVarsCSS();
  expect(css).toContain("--ds-text-serif-18-28-regular: 400 1.125rem/1.75rem var(--ds-font-serif);");
  expect(css).toContain("--ds-text-mono-13-20-regular: 400 0.8125rem/1.25rem var(--ds-font-mono);");
  expect(emitUtilitiesCSS()).toContain(".ds-text-mono-15-24-medium { font: var(--ds-text-mono-15-24-medium); }");
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `typography.ts`:

```ts
export type ComboRole = "sans" | "serif" | "mono";
export interface TypographyCombo { fontSize: number; lineHeight: number; weight: Weight; role?: ComboRole; }
export const comboName = (c: TypographyCombo) =>
  `${c.role && c.role !== "sans" ? `${c.role}-` : ""}${c.fontSize}-${c.lineHeight}-${c.weight}`;
export const comboFontVar = (c: TypographyCombo) => `--ds-font-${c.role ?? "sans"}`;
```

Append to `typographyCombos`:

```ts
  // Serif body tier (WS2 — portfolio coverage)
  { fontSize: 18, lineHeight: 28, weight: "regular", role: "serif" },
  { fontSize: 20, lineHeight: 30, weight: "regular", role: "serif" },
  { fontSize: 20, lineHeight: 32, weight: "regular", role: "serif" },
  { fontSize: 24, lineHeight: 36, weight: "regular", role: "serif" },
  { fontSize: 28, lineHeight: 40, weight: "regular", role: "serif" },
  // Mono label tier (WS2)
  { fontSize: 13, lineHeight: 20, weight: "regular", role: "mono" },
  { fontSize: 14, lineHeight: 20, weight: "regular", role: "mono" },
  { fontSize: 15, lineHeight: 24, weight: "regular", role: "mono" },
  { fontSize: 15, lineHeight: 24, weight: "medium", role: "mono" },
```

`emit-utilities.ts` typography var loop — replace the hardcoded `var(--ds-font-sans)` with `var(${comboFontVar(c)})` (import `comboFontVar`). `emit-dtcg.ts` typography entries: `fontFamily: \`{fontFamily.${c.role ?? "sans"}}\`` and extend the `fontFamily` group:

```ts
    fontFamily: {
      sans: { $type: "fontFamily", $value: ["ui-sans-serif", "system-ui", "sans-serif"] },
      serif: { $type: "fontFamily", $value: ["Georgia", "Times New Roman", "serif"] },
      mono: { $type: "fontFamily", $value: ["ui-monospace", "SFMono-Regular", "monospace"] },
      display: { $type: "fontFamily", $value: ["ui-sans-serif", "system-ui", "sans-serif"] },
    },
```

- [ ] **Step 4: Verify** — scales + emit-dtcg tests pass (update `emit-dtcg.test.ts` expectations if they assert the fontFamily group shape); build green.
- [ ] **Step 5: Commit** `feat(tokens): serif/mono typography combos via combo roles (WS2)`.

### Task 8: Fluid display tier (D28)

**Files:** Modify `packages/tokens/src/scales/typography.ts`, `scripts/emit-utilities.ts`, `scripts/emit-json.ts`, `scripts/emit-dtcg.ts`; modify `apps/storybook/src/token-docs/token-reader.ts`; create `apps/storybook/src/token-docs/DisplayTokens.stories.tsx`; test `__tests__/scales.test.ts`

**Interfaces:**
- Produces: `displayCombos: DisplayCombo[]`, `displayName(d)` → `56-128-black`; CSS `--ds-display-{name}` + `.ds-display-{name}`; `resolved/*.json` gains top-level `display` array; `token-reader` exports `docDisplay`.

- [ ] **Step 1: Failing tests:**

```ts
it("emits display combos pixel-true at both clamp endpoints (D28)", () => {
  const css = emitScaleVarsCSS();
  expect(css).toContain("--ds-display-56-128-black: 900 clamp(3.5rem, 9vw, 8rem)/0.95 var(--ds-font-display);");
  expect(css).toContain("--ds-display-36-64-black: 900 clamp(2.25rem, 5vw, 4rem)/1.05 var(--ds-font-display);");
  expect(css).toContain("--ds-display-32-32-extrabold: 800 2rem/1.1 var(--ds-font-display);");
});

it("display utilities carry tracking and uppercase (D28)", () => {
  const css = emitUtilitiesCSS();
  expect(css).toContain(".ds-display-56-128-black { font: var(--ds-display-56-128-black); letter-spacing: -0.02em; text-transform: uppercase; }");
  expect(css).toContain(".ds-display-32-32-extrabold { font: var(--ds-display-32-32-extrabold); letter-spacing: -0.01em; text-transform: uppercase; }");
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `typography.ts`:

```ts
export interface DisplayCombo { min: number; max: number; vw: number; lineHeight: number; weight: Weight; tracking: number; }
/** Fluid display tier (D28): --ds-display-{min}-{max}-{weight}, pixel-true at
 * both clamp endpoints. Tracking/uppercase live in the .ds-display-* utilities
 * because the font shorthand can't carry them. */
export const displayCombos: DisplayCombo[] = [
  { min: 56, max: 128, vw: 9, lineHeight: 0.95, weight: "black", tracking: -0.02 },
  { min: 36, max: 64, vw: 5, lineHeight: 1.05, weight: "black", tracking: -0.02 },
  { min: 32, max: 32, vw: 0, lineHeight: 1.1, weight: "extrabold", tracking: -0.01 },
];
export const displayName = (d: DisplayCombo) => `${d.min}-${d.max}-${d.weight}`;
```

`emit-utilities.ts` — in `emitScaleVarsCSS` after the typography loop (import `displayCombos, displayName`):

```ts
  lines.push("");
  for (const d of displayCombos) {
    const size = d.min === d.max ? pxToRem(d.min) : `clamp(${pxToRem(d.min)}, ${d.vw}vw, ${pxToRem(d.max)})`;
    lines.push(`    --ds-display-${displayName(d)}: ${WEIGHT_VALUES[d.weight]} ${size}/${d.lineHeight} var(--ds-font-display);`);
  }
```

In `emitUtilitiesCSS` after the typography utilities:

```ts
  lines.push("");
  for (const d of displayCombos) {
    lines.push(`  .ds-display-${displayName(d)} { font: var(--ds-display-${displayName(d)}); letter-spacing: ${d.tracking}em; text-transform: uppercase; }`);
  }
```

`emit-json.ts` — add to the emitted object:

```ts
      display: displayCombos.map((d) => ({ name: displayName(d), ...d, cssWeight: WEIGHT_VALUES[d.weight] })),
```

`emit-dtcg.ts` — add a `display` group next to `typography` (clamp strings are a documented DTCG extension, not standard):

```ts
    display: Object.fromEntries(displayCombos.map((d) => [displayName(d), {
      $type: "typography",
      $value: { fontFamily: "{fontFamily.display}", fontSize: d.min === d.max ? `${d.min}px` : `clamp(${d.min}px, ${d.vw}vw, ${d.max}px)`, lineHeight: d.lineHeight, fontWeight: WEIGHT_VALUES[d.weight], letterSpacing: `${d.tracking}em` },
    }])),
```

- [ ] **Step 4: Storybook.** `token-reader.ts`: add `display` to the `ResolvedTheme` interface (`display: { name: string; min: number; max: number; vw: number; lineHeight: number; weight: string; tracking: number; cssWeight: number }[]`) and export `export const docDisplay = RESOLVED.light.display;`. Note: rebuild tokens first so the JSON carries the field. Create `DisplayTokens.stories.tsx` (mirror TypographyTokens structure, title `"Tokens and Assets/Display"`, iterate `docDisplay`, specimen `<span className={"ds-display-" + d.name}>Aa Ember Field</span>` plus a code label `display-{d.name}`).
- [ ] **Step 5: Verify** — `pnpm --filter @handamade/tokens build && pnpm test` green; `pnpm --filter storybook build` compiles.
- [ ] **Step 6: Commit** `feat(tokens): fluid display tier --ds-display-{min}-{max}-{weight} (D28)`.

### Task 9: Brand font assignment (D29) + ember fonts

**Files:** Modify `packages/tokens/src/themes/customers/index.ts`, `src/themes/customers/ember.ts`, `scripts/emit-css.ts`, `scripts/build.ts`, `src/guidance.ts`; test `__tests__/emit-css.test.ts`, `__tests__/guidance.test.ts`

**Interfaces:**
- Produces: `BrandFonts` + `CustomerTheme.fonts`; `emitThemeCSS(themeName, theme, palette, slots, opts?: { fonts?: BrandFonts })` — Task 17 extends `opts` with `componentOverrides`.

- [ ] **Step 1: Failing test** (`emit-css.test.ts`):

```ts
it("emits brand font roles inside the theme block (D29)", () => {
  const css = emitThemeCSS("ember", { bgPrimary: token({ from: slot.canvas }) },
    { emberCanvas: { l: 0.147, c: 0.004, h: 49 } },
    { ink: "emberCanvas", canvas: "emberCanvas", accent: "emberCanvas", success: "emberCanvas", warning: "emberCanvas", danger: "emberCanvas" },
    { fonts: { display: '"Archivo", system-ui, sans-serif', mono: '"IBM Plex Mono", "Courier New", monospace' } });
  expect(css).toContain(`--ds-font-display: "Archivo", system-ui, sans-serif;`);
  expect(css).toContain(`--ds-font-mono: "IBM Plex Mono", "Courier New", monospace;`);
  expect(css).toContain(`[data-ds-theme="ember"]`);
});
```

- [ ] **Step 2: Run** → FAIL (extra argument).
- [ ] **Step 3: Implement.** `customers/index.ts`:

```ts
/** Brand-level font role assignment (D29). Emitted inside the brand's theme
 * block; the DS never ships font files — consumers load the webfonts. */
export interface BrandFonts { sans?: string; serif?: string; mono?: string; display?: string; }
```

Add `fonts?: BrandFonts;` to `CustomerTheme`. `emit-css.ts` — extend the signature:

```ts
export function emitThemeCSS(
  themeName: string,
  theme: ThemeDef,
  palette: Palette,
  slots: SlotMap,
  opts?: { fonts?: import("../src/themes/customers/index.js").BrandFonts },
): string {
```

and after the palette-var loop inside the selector block:

```ts
  if (opts?.fonts) {
    for (const [role, stack] of Object.entries(opts.fonts)) {
      lines.push(`    --ds-font-${role}: ${stack};`);
    }
  }
```

`build.ts`: add `fonts?: BrandFonts` to `ThemeConfig` (import type from customers/index.js), populate it in the customer mapping (`fonts: c.fonts`), and pass `{ fonts: config.fonts }` as the fifth arg to `emitThemeCSS`. `ember.ts` registration gains:

```ts
    fonts: {
      sans: '"Archivo", system-ui, sans-serif',
      serif: '"IBM Plex Serif", Georgia, serif',
      mono: '"IBM Plex Mono", "Courier New", monospace',
      display: '"Archivo", system-ui, sans-serif',
    },
```

(registration object in `customers/index.ts`: `ember: { palette: emberPalette, slots: emberSlots, base: "dark", overrides: emberOverrides, fonts: emberFonts }` — export `emberFonts` from `ember.ts` typed `BrandFonts`.)

`guidance.ts` — add top-level key:

```ts
  fonts: {
    roles: ["sans", "serif", "mono", "display"],
    note: "Font roles are brand-level (D29). The DS ships no font files: consumers load each brand's webfonts themselves.",
    brands: { ember: { archivo: "800,900 (display/sans)", ibmPlexSerif: "400 (serif)", ibmPlexMono: "400,500 (mono)" } },
  },
```

- [ ] **Step 4: Verify** — tests pass (update `guidance.test.ts` if it snapshots keys); build green; `grep -n "font-display" packages/tokens/dist/ember.css` shows the Archivo stack.
- [ ] **Step 5: Commit** `feat(tokens): brand-level font roles; ember loads Archivo/IBM Plex (D29)`.

**Milestone 2 gate:** `pnpm build` · `pnpm test` · `pnpm lint` · Storybook Typography page shows serif/mono combos, Display page renders.

---

# Milestone 3 — WS3: Motion tokens (D30)

### Task 10: Motion scale + emitted vars

**Files:** Create `packages/tokens/src/scales/motion.ts`; modify `scripts/emit-utilities.ts`, `scripts/emit-json.ts`, `scripts/emit-dtcg.ts`, `src/guidance.ts`; test `__tests__/scales.test.ts`

**Interfaces:**
- Produces: `durationScale`, `easings`; CSS `--ds-duration-{150,200,350,450,600}`, `--ds-ease-{standard,in-out,soft}`.

- [ ] **Step 1: Failing tests:**

```ts
import { durationScale, easings } from "../src/scales/motion.js";

it("motion scale matches spec (WS3)", () => {
  expect([...durationScale]).toEqual([150, 200, 350, 450, 600]);
  expect(easings.soft).toBe("cubic-bezier(0.2, 0.6, 0.2, 1)");
});

it("emits duration and easing vars", () => {
  const css = emitScaleVarsCSS();
  expect(css).toContain("--ds-duration-150: 150ms;");
  expect(css).toContain("--ds-duration-600: 600ms;");
  expect(css).toContain("--ds-ease-standard: ease;");
  expect(css).toContain("--ds-ease-in-out: ease-in-out;");
  expect(css).toContain("--ds-ease-soft: cubic-bezier(0.2, 0.6, 0.2, 1);");
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** `motion.ts`:

```ts
/** Motion duration scale in ms (WS3). Zeroed under prefers-reduced-motion (D30). */
export const durationScale = [150, 200, 350, 450, 600] as const;

/** Named easing curves. `soft` is the signature glide (portfolio thumbnails/cards). */
export const easings = {
  standard: "ease",
  "in-out": "ease-in-out",
  soft: "cubic-bezier(0.2, 0.6, 0.2, 1)",
} as const;
```

`emit-utilities.ts` `emitScaleVarsCSS` (import both; after display combos):

```ts
  lines.push("");
  for (const ms of durationScale) lines.push(`    --ds-duration-${ms}: ${ms}ms;`);
  for (const [name, curve] of Object.entries(easings)) lines.push(`    --ds-ease-${name}: ${curve};`);
```

`emit-json.ts` scales object: `motion: { durations: [...durationScale], easings },`. `emit-dtcg.ts` — add top-level groups:

```ts
    duration: Object.fromEntries(durationScale.map((ms) => [String(ms), { $type: "duration", $value: `${ms}ms` }])),
    cubicBezier: {
      standard: { $type: "cubicBezier", $value: [0.25, 0.1, 0.25, 1] },
      "in-out": { $type: "cubicBezier", $value: [0.42, 0, 0.58, 1] },
      soft: { $type: "cubicBezier", $value: [0.2, 0.6, 0.2, 1] },
    },
```

`guidance.ts`:

```ts
  motion: {
    durations: [150, 200, 350, 450, 600],
    easings: { standard: "ease", "in-out": "ease-in-out", soft: "cubic-bezier(0.2, 0.6, 0.2, 1)" },
    reducedMotion: "All --ds-duration-* zero under prefers-reduced-motion (D30). Always drive transitions/animations with duration tokens; never hardcode times.",
    recipes: {
      pulseDown: "App-level keyframe (the DS ships none): @keyframes pulse-down { 0%,100% { transform: translateY(0); opacity: .5; } 50% { transform: translateY(6px); opacity: 1; } } — drive with var(--ds-ease-in-out).",
    },
  },
```

- [ ] **Step 4: Verify** → tests + build green. **Step 5: Commit** `feat(tokens): motion tokens — durations + easings (WS3)`.

### Task 11: Reduced-motion zeroing (D30)

**Files:** Modify `packages/tokens/scripts/emit-utilities.ts` (`emitUtilitiesCSS`); test `__tests__/scales.test.ts`

- [ ] **Step 1: Failing test:**

```ts
it("zeroes durations under prefers-reduced-motion (D30)", () => {
  const css = emitUtilitiesCSS();
  expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  expect(css).toContain("--ds-duration-150: 0.01ms;");
  expect(css).toContain("--ds-duration-600: 0.01ms;");
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** — before the closing `lines.push("}")` in `emitUtilitiesCSS`:

```ts
  lines.push("");
  lines.push("  /* Reduced motion (D30): zero every duration token; anything driven by");
  lines.push("     --ds-duration-* complies for free. ds.utilities wins over ds.base. */");
  lines.push("  @media (prefers-reduced-motion: reduce) {");
  lines.push("    :root {");
  for (const ms of durationScale) lines.push(`      --ds-duration-${ms}: 0.01ms;`);
  lines.push("    }");
  lines.push("  }");
```

- [ ] **Step 4: Verify** → PASS; build green. **Step 5: Commit** `feat(tokens): reduced-motion zeroes duration tokens in utilities (D30)`.

### Task 12: Tokenize component transitions + stylelint enforcement

**Files:** Modify `packages/react/src/Button/button.module.css:14-17`, `IconButton/icon-button.module.css:12-15`, `Input/input.module.css:12-14`, `Select/select.module.css:18-20`, `Checkbox/checkbox.module.css:44-46`, `Switch/switch.module.css:43,65`; modify `tools/stylelint-plugin-ds-tokens.mjs`

- [ ] **Step 1: Extend stylelint plugin (the failing "test" is lint itself).** In `stylelint-plugin-ds-tokens.mjs`, change `ALLOWED_GLOBAL` to:

```js
const ALLOWED_GLOBAL = /^--ds-(space|size|radius|text|font|duration|ease|z)-/;
```

and inside `walkDecls`, after the existing var check, add:

```js
    if (/^(transition|animation)/.test(decl.prop) && /(^|[\s,(])\d+(\.\d+)?m?s\b/.test(decl.value)) {
      stylelint.utils.report({
        ruleName, result, node: decl,
        message: `literal duration in "${decl.prop}" — use var(--ds-duration-*) (ds/component-tokens-only)`,
      });
    }
```

- [ ] **Step 2: Run** — `pnpm lint:css` → FAILS on all six module files (the `0.15s ease` literals). This is the red state.
- [ ] **Step 3: Migrate.** In each file replace the transition values, e.g. button.module.css:

```css
  transition:
    background-color var(--ds-duration-150) var(--ds-ease-standard),
    color var(--ds-duration-150) var(--ds-ease-standard);
```

Same pattern for icon-button (background-color, color), input/select (border-color, outline), checkbox (background-color, border-color), switch (`background-color var(--ds-duration-150) var(--ds-ease-standard)` on `.track`, `left var(--ds-duration-150) var(--ds-ease-standard)` on `.thumb`).

- [ ] **Step 4: Verify** — `pnpm lint:css` → clean; `pnpm test` (react component tests unaffected); `pnpm build`.
- [ ] **Step 5: Commit** `refactor(react): transitions consume duration/ease tokens; stylelint forbids literal durations (WS3)`.

### Task 13: Motion token docs page

**Files:** Create `apps/storybook/src/token-docs/MotionTokens.stories.tsx`; modify `token-reader.ts`

- [ ] **Step 1: Implement.** `token-reader.ts`: extend `ResolvedTheme` with `scales` (add `motion: { durations: number[]; easings: Record<string, string> }` to the existing scales shape — the interface currently omits `scales`; add `scales: { space: number[]; size: number[]; radius: number[]; motion: { durations: number[]; easings: Record<string, string> }; layout?: unknown }`) and export `export const docMotion = RESOLVED.light.scales.motion;`. New story (title `"Tokens and Assets/Motion"`): table of `--ds-duration-*` / `--ds-ease-*` rows (name, value) and a hover-demo square per easing using `transition: transform var(--ds-duration-350) var(--ds-ease-<name>)`, plus a note paragraph quoting D30.
- [ ] **Step 2: Verify** — `pnpm --filter @handamade/tokens build && pnpm --filter storybook build` green.
- [ ] **Step 3: Commit** `docs(storybook): motion token page (WS3)`.

**Milestone 3 gate:** `pnpm build` · `pnpm test` · `pnpm lint` (incl. new literal-duration rule) · Storybook builds.

---

# Milestone 4 — WS4: Layout & viewport tokens (D31, D32)

### Task 14: Layout scale + spacing extension

**Files:** Create `packages/tokens/src/scales/layout.ts`; modify `src/scales/spacing.ts`; test `__tests__/scales.test.ts`

**Interfaces:**
- Produces: `breakpoints = { sm: 560, md: 960 }`, `container = { max: 1312, gutter: 40, gutterNarrow: 24 }`, `zIndex = { nav: 100, overlay: 1000, tooltip: 1100 }`; spacing gains 96/120/144.

- [ ] **Step 1: Failing tests:**

```ts
import { breakpoints, container, zIndex } from "../src/scales/layout.js";

it("layout constants match spec (WS4, D31)", () => {
  expect(breakpoints).toEqual({ sm: 560, md: 960 });
  expect(container).toEqual({ max: 1312, gutter: 40, gutterNarrow: 24 });
  expect(zIndex).toEqual({ nav: 100, overlay: 1000, tooltip: 1100 });
});
```

and update the existing spacing expectation to `[0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120, 144]`.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** `layout.ts`:

```ts
/** Viewport breakpoints in px — build-time constants (D31): CSS custom
 * properties can't drive @media, so these are exported JS values baked into
 * emitted media queries. */
export const breakpoints = { sm: 560, md: 960 } as const;

/** Page container metrics in px. gutterNarrow applies under breakpoints.md. */
export const container = { max: 1312, gutter: 40, gutterNarrow: 24 } as const;

/** Stacking rungs. */
export const zIndex = { nav: 100, overlay: 1000, tooltip: 1100 } as const;
```

`spacing.ts`: `export const spacingScale = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120, 144] as const;`

- [ ] **Step 4: Verify** → PASS (spacing utilities now emit the new steps automatically). **Step 5: Commit** `feat(tokens): layout constants + section-rhythm spacing 96/120/144 (WS4, D31)`.

### Task 15: Emit layout vars, `.ds-container`, breakpoints export

**Files:** Modify `packages/tokens/scripts/emit-utilities.ts`, `scripts/emit-types.ts`, `scripts/build.ts:123-127`, `scripts/emit-json.ts`, `scripts/emit-dtcg.ts`, `src/guidance.ts`; test `__tests__/scales.test.ts`, `__tests__/emit-types.test.ts`

- [ ] **Step 1: Failing tests:**

```ts
it("emits container, gutter, and z vars (WS4)", () => {
  const css = emitScaleVarsCSS();
  expect(css).toContain("--ds-container-max: 82rem;");
  expect(css).toContain("--ds-gutter: 2.5rem;");
  expect(css).toContain("--ds-z-nav: 100;");
  expect(css).toContain("--ds-z-tooltip: 1100;");
});

it("emits .ds-container and the gutter step-down (D31)", () => {
  const css = emitUtilitiesCSS();
  expect(css).toContain(".ds-container { max-width: var(--ds-container-max); margin-inline: auto; padding-inline: var(--ds-gutter); }");
  expect(css).toContain("@media (max-width: 960px)");
  expect(css).toContain("--ds-gutter: 1.5rem;");
});
```

and in `emit-types.test.ts`:

```ts
it("emits breakpoints as literal constants (D31)", () => {
  const out = emitTokenTypes({ light: lightTheme }, [24], ["accent"], { sm: 560, md: 960 });
  expect(out).toContain("export declare const breakpoints: {");
  expect(out).toContain("readonly sm: 560;");
  expect(out).toContain("readonly md: 960;");
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** `emit-utilities.ts` (import `breakpoints, container, zIndex`); in `emitScaleVarsCSS` after motion:

```ts
  lines.push("");
  lines.push(`    --ds-container-max: ${pxToRem(container.max)};`);
  lines.push(`    --ds-gutter: ${pxToRem(container.gutter)};`);
  for (const [name, z] of Object.entries(zIndex)) lines.push(`    --ds-z-${name}: ${z};`);
```

In `emitUtilitiesCSS` before the reduced-motion block:

```ts
  lines.push("");
  lines.push(`  .ds-container { max-width: var(--ds-container-max); margin-inline: auto; padding-inline: var(--ds-gutter); }`);
  lines.push(`  /* Gutter narrows under md — breakpoint baked at build time (D31). */`);
  lines.push(`  @media (max-width: ${breakpoints.md}px) {`);
  lines.push(`    :root { --ds-gutter: ${pxToRem(container.gutterNarrow)}; }`);
  lines.push(`  }`);
```

`emit-types.ts` — add 4th param `bps: Record<string, number> = {}` and before the final join:

```ts
  if (Object.keys(bps).length > 0) {
    lines.push("export declare const breakpoints: {");
    for (const [k, v] of Object.entries(bps)) lines.push(`  readonly ${k}: ${v};`);
    lines.push("};");
    lines.push("");
  }
```

`build.ts`: pass `breakpoints` (import from `../src/scales/layout.js`) as the 4th arg, and change the runtime module write to:

```ts
  writeFileSync(join(typesDir, "index.js"), `export const breakpoints = ${JSON.stringify(breakpoints)};\n`);
```

`emit-json.ts` scales: `layout: { breakpoints, container, zIndex },` (import from layout.js). `emit-dtcg.ts` dimension group gains:

```ts
      breakpoint: Object.fromEntries(Object.entries(breakpoints).map(([k, v]) => [k, { $type: "dimension", $value: `${v}px` }])),
      container: { max: dim(container.max), gutter: dim(container.gutter), gutterNarrow: dim(container.gutterNarrow) },
```

`guidance.ts`:

```ts
  layout: {
    breakpoints: { sm: 560, md: 960 },
    note: "Breakpoints are build-time constants (D31): import { breakpoints } from '@handamade/tokens/types'. CSS vars cannot drive @media.",
    container: "Use .ds-container — max-width 1312px, gutter 40px stepping to 24px under md.",
    zIndex: { nav: 100, overlay: 1000, tooltip: 1100 },
  },
```

- [ ] **Step 4: Verify** — tests + build; `node -e "import('./packages/tokens/dist/types/index.js').then(m => console.log(m.breakpoints))"` prints `{ sm: 560, md: 960 }`.
- [ ] **Step 5: Commit** `feat(tokens): container/gutter/z vars, .ds-container, breakpoints JS export (WS4, D31)`.

### Task 16: `borderFaint` + scrim tokens (D32)

**Files:** Modify `packages/tokens/src/themes/light.ts`, `src/themes/dark.ts`, `scripts/emit-dtcg.ts:8` (GROUPS); test `__tests__/light-theme.test.ts`, `__tests__/dark-theme.test.ts`

- [ ] **Step 1: Failing test** (both theme test files):

```ts
it("defines hairline and scrim alphas (WS4, D32)", () => {
  expect(lightTheme.borderFaint).toEqual(token({ from: ref.fgPrimary, alpha: 0.08 }));
  expect(lightTheme.scrimSoft).toEqual(token({ from: ref.bgPrimary, alpha: 0.25 }));
  expect(lightTheme.scrimMedium).toEqual(token({ from: ref.bgPrimary, alpha: 0.35 }));
  expect(lightTheme.scrimHeavy).toEqual(token({ from: ref.bgPrimary, alpha: 0.82 }));
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** — in **both** themes, `borderFaint` next to the existing borders, scrims after them:

```ts
  borderFaint: token({ from: ref.fgPrimary, alpha: 0.08 }),
  // Scrims (D32): page-canvas surfaces at alpha — never text pairs, so they
  // carry no AA gate entries.
  scrimSoft: token({ from: ref.bgPrimary, alpha: 0.25 }),
  scrimMedium: token({ from: ref.bgPrimary, alpha: 0.35 }),
  scrimHeavy: token({ from: ref.bgPrimary, alpha: 0.82 }),
```

(`bgPrimary` *is* the canvas in light and the dark page surface in dark/ember — "canvas-derived" in the spec's sense.) `emit-dtcg.ts`: `const GROUPS = ["bg", "fg", "fill", "border", "scrim"] as const;`

- [ ] **Step 4: Verify** — theme tests (update any full token-name-list assertions), build green — ember inherits the dark formulas, so `--ds-scrim-heavy` in `dist/ember.css` resolves against `#0c0a09` ≈ the portfolio's `rgba(12,10,9,.82)`. Confirm: `grep -n "scrim-heavy" packages/tokens/dist/ember.css`.
- [ ] **Step 5: Commit** `feat(tokens): borderFaint hairline + scrim alphas (WS4, D32)`.

### Task 17: Tooltip z-index token + stylelint z rule + layout docs page

**Files:** Modify `packages/react/src/Tooltip/tooltip.module.css:12`, `tools/stylelint-plugin-ds-tokens.mjs`; create `apps/storybook/src/token-docs/LayoutTokens.stories.tsx`; modify `token-reader.ts`

- [ ] **Step 1: Extend stylelint** — add the z-index literal check next to the duration check:

```js
    if (decl.prop === "z-index" && /^\d+$/.test(decl.value.trim())) {
      stylelint.utils.report({
        ruleName, result, node: decl,
        message: `literal z-index — use var(--ds-z-*) (ds/component-tokens-only)`,
      });
    }
```

- [ ] **Step 2: Run** — `pnpm lint:css` → FAILS on `tooltip.module.css` (`z-index: 1000`).
- [ ] **Step 3: Migrate** — tooltip.module.css: `z-index: var(--ds-z-tooltip);` (allowed by the `z` prefix added in Task 12).
- [ ] **Step 4: Layout docs.** `token-reader.ts`: type + export `docLayout = RESOLVED.light.scales.layout;`. `LayoutTokens.stories.tsx` (title `"Tokens and Assets/Layout"`): render breakpoints/container/zIndex tables from `docLayout`, a live `.ds-container` demo strip, and swatches for `--ds-border-faint` / `--ds-scrim-*` over a sample image div.
- [ ] **Step 5: Verify** — `pnpm lint:css` clean, `pnpm build`, storybook builds. **Commit** `feat(react,tokens): tooltip stacks on --ds-z-tooltip; layout token docs (WS4)`.

**Milestone 4 gate:** `pnpm build` · `pnpm test` · `pnpm lint` · Storybook Layout/Motion/Display pages render.

---

# Milestone 5 — WS5: Components & icons (D33–D36)

### Task 18: D34 infra — brand component overrides that actually win

**Files:** Modify `packages/tokens/scripts/emit-components.ts`, `scripts/emit-css.ts`, `scripts/build.ts`, `src/themes/customers/index.ts`; test `__tests__/emit-components.test.ts`, `__tests__/emit-css.test.ts`

**Interfaces:**
- Produces: `CustomerTheme.componentOverrides?: Record<string, string>` (keys without `--ds-`, e.g. `"card-radius": "0"`); `emitThemeCSS` `opts` gains `componentOverrides`; components.css defaults move to `:where(:root, [data-ds-theme])`.

**Why:** layer order is `ds.theme → ds.components`, so a brand override in the theme layer always loses to component defaults. Zero-specificity defaults + overrides emitted into `@layer ds.components` at `[data-ds-theme="<name>"]` make D34 work regardless of import order.

- [ ] **Step 1: Failing tests.** `emit-components.test.ts` — update selector expectation:

```ts
expect(css).toContain(":where(:root, [data-ds-theme])");
```

`emit-css.test.ts`:

```ts
it("emits brand component-token overrides into the components layer (D34)", () => {
  const css = emitThemeCSS("ember", { bgPrimary: token({ from: slot.canvas }) }, palette, slots,
    { componentOverrides: { "card-radius": "0", "button-font": "var(--ds-text-mono-15-24-regular)" } });
  expect(css).toContain(`@layer ds.components {\n  [data-ds-theme="ember"] {`);
  expect(css).toContain("--ds-card-radius: 0;");
  expect(css).toContain("--ds-button-font: var(--ds-text-mono-15-24-regular);");
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** `emit-components.ts`:

```ts
  // :where() = zero specificity: brand overrides (D34), emitted at
  // [data-ds-theme="<name>"] in this same layer, win regardless of import order.
  return `@layer ds.components {\n  :where(:root, [data-ds-theme]) {\n${lines.join("\n")}\n  }\n}\n`;
```

`emit-css.ts`: `opts` type gains `componentOverrides?: Record<string, string>`; after the theme block's closing lines:

```ts
  if (opts?.componentOverrides && Object.keys(opts.componentOverrides).length > 0) {
    lines.push("@layer ds.components {");
    lines.push(`  [data-ds-theme="${themeName}"] {`);
    for (const [name, value] of Object.entries(opts.componentOverrides)) {
      lines.push(`    --ds-${name}: ${value};`);
    }
    lines.push("  }");
    lines.push("}");
  }
```

`customers/index.ts`: add to `CustomerTheme`:

```ts
  /** Component-token overrides (D34) — part of the themeable surface. Keys
   * omit the --ds- prefix, e.g. "card-radius": "0". Must not break a11y,
   * sizing contracts, or interaction states. */
  componentOverrides?: Record<string, string>;
```

`build.ts`: thread `componentOverrides: c.componentOverrides` through `ThemeConfig` and into the `emitThemeCSS` call.

- [ ] **Step 4: Verify** → tests + build. **Step 5: Commit** `feat(tokens): brand component-token overrides win via :where() defaults (D34)`.

### Task 19: Button `outline` variant

**Files:** Modify `packages/tokens/src/components/button.ts`, `src/guidance.ts`, `packages/react/src/Button/Button.tsx`, `Button/button.module.css`, `Button/Button.stories.tsx`; test `packages/react/src/Button/Button.test.tsx`, `packages/tokens/__tests__/button-tokens.test.ts`

- [ ] **Step 1: Failing tests.** `Button.test.tsx`:

```tsx
it("renders the outline variant", () => {
  render(<Button variant="outline">Ghost CTA</Button>);
  expect(screen.getByRole("button", { name: "Ghost CTA" }).className).toMatch(/outline/);
});
```

`button-tokens.test.ts`:

```ts
it("outline hover label reuses the accent label binding (D37)", () => {
  expect(buttonVars["outline-fg-hover"]).toBe("var(--ds-button-accent-fg)");
  expect(buttonVars["outline-border"]).toBe("var(--ds-border-strong)");
  expect(BUTTON_VARIANTS).toContain("outline");
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** `button.ts`: append `"outline"` to `BUTTON_VARIANTS`; add to `buttonVars`:

```ts
  "outline-bg": "transparent",
  "outline-bg-hover": "var(--ds-fill-accent)",
  "outline-bg-active": "oklch(from var(--ds-fill-accent) calc(l - 0.04) c h)",
  "outline-fg": "var(--ds-fg-primary)",
  // Hover fills accent; label follows the accent variant's binding (fgOnAccent,
  // D37) — the literal "canvas label" fails AA in default light/dark.
  "outline-fg-hover": "var(--ds-button-accent-fg)",
  "outline-border": "var(--ds-border-strong)",
```

`Button.tsx`: add `"outline"` to the `Variant` union and `outline: styles.outline` to `variantClass`. `button.module.css`:

```css
/* Outline — ghost-bordered CTA (WS5). Hover fills accent. */
.outline {
  background: var(--ds-button-outline-bg);
  color: var(--ds-button-outline-fg);
  border: 1px solid var(--ds-button-outline-border);
}
.outline:hover:not(:disabled) {
  background: var(--ds-button-outline-bg-hover);
  color: var(--ds-button-outline-fg-hover);
  border-color: transparent;
}
.outline:active:not(:disabled) {
  background: var(--ds-button-outline-bg-active);
}
```

`guidance.ts` variants array — insert after ghost:

```ts
    { variant: "outline", intent: "Bordered ghost — visible structure, no fill until hover", typicalUse: "Marketing CTA, download button; hover fills accent" },
```

Stories: add an `Outline` story rendering all sizes.

- [ ] **Step 4: Verify** — react tests, tokens tests, build (gate re-checks `(fgOnAccent, fillAccent)` — already passing), `pnpm lint:css`.
- [ ] **Step 5: Commit** `feat(react,tokens): Button outline variant (WS5)`.

### Task 20: Button/IconButton `href` polymorphism (D33)

**Files:** Modify `packages/react/src/Button/Button.tsx`, `Button/button.module.css`, `IconButton/IconButton.tsx`, `IconButton/icon-button.module.css`; tests `Button.test.tsx`, `IconButton.test.tsx`; stories both

- [ ] **Step 1: Failing tests** (`Button.test.tsx`; mirror for IconButton with `aria-label`):

```tsx
it("renders an anchor when href is provided", () => {
  render(<Button href="/docs" variant="accent">Docs</Button>);
  const a = screen.getByRole("link", { name: "Docs" });
  expect(a).toHaveAttribute("href", "/docs");
});

it("disabled anchor is non-focusable and suppresses activation (D33)", async () => {
  const onClick = vi.fn();
  render(<Button href="/docs" disabled onClick={onClick}>Docs</Button>);
  const a = screen.getByText("Docs");
  expect(a).not.toHaveAttribute("href");
  expect(a).toHaveAttribute("aria-disabled", "true");
  a.focus();
  expect(a).not.toHaveFocus();
  await userEvent.click(a).catch(() => {});
  expect(onClick).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** `Button.tsx` — extend props and render:

```tsx
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, Ref } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant. @default "neutral" */
  variant?: Variant;
  /** Height in px (24 | 32 | 40 | 48). @default 32 */
  size?: Size;
  /** Render as an anchor with this href (D33). disabled → aria-disabled,
   * no href attribute, pointer-events: none. */
  href?: string;
  /** Anchor target; only used with href. */
  target?: string;
  /** Anchor rel; only used with href. */
  rel?: string;
  /** Forwarded ref to the underlying element. */
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
}

export function Button({
  variant = "neutral",
  size = 32,
  href,
  target,
  rel,
  disabled,
  className,
  ref,
  ...rest
}: ButtonProps) {
  const cls = [
    styles.button,
    variantClass[variant],
    sizeClass[size],
    href !== undefined && disabled ? styles.disabled : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href !== undefined) {
    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        className={cls}
        href={disabled ? undefined : href}
        target={target}
        rel={rel}
        aria-disabled={disabled || undefined}
        {...(rest as unknown as AnchorHTMLAttributes<HTMLAnchorElement>)}
      />
    );
  }

  return (
    <button ref={ref as Ref<HTMLButtonElement>} className={cls} disabled={disabled} {...rest} />
  );
}
```

`button.module.css` — anchors can't use `:disabled`; add after the `:disabled` rule:

```css
/* Disabled-as-anchor (D33): no href (non-focusable) + no pointer events. */
.button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
```

and normalize anchor rendering on the base class: add `text-decoration: none;` to `.button`. Change variant hover/active guards from `:not(:disabled)` to `:not(:disabled):not(.disabled)` in all variants (mechanical, all 8). Apply the identical treatment to `IconButton.tsx` / `icon-button.module.css` (class name `styles.iconButton`, alias rule maps its tokens to button's — unchanged).

- [ ] **Step 4: Verify** — react tests pass; `pnpm lint:css`; stories: add `AsLink` (href + target="_blank" + rel) and `DisabledLink` stories.
- [ ] **Step 5: Commit** `feat(react): Button/IconButton render anchors via href; disabled anchors inert (D33)`.

### Task 21: `--ds-button-font` (brand-restylable button typography)

**Files:** Modify `packages/react/src/Button/button.module.css:31-53`, `packages/tokens/src/themes/customers/ember.ts` (+ registration), `src/guidance.ts`; test `packages/tokens/__tests__/ember-theme.test.ts`

Design: the token is **unset by default**; each size's `font` uses it with the size's combo as fallback, so per-size defaults survive until a brand deliberately unifies button typography (D34 documented override).

- [ ] **Step 1: Failing test** (`ember-theme.test.ts`):

```ts
it("ember restyles button typography to mono via component override (D34)", () => {
  expect(customerThemes.ember.componentOverrides?.["button-font"]).toBe("var(--ds-text-mono-15-24-regular)");
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** `button.module.css` size rules:

```css
.size24 { height: var(--ds-size-24); padding-inline: var(--ds-space-8); font: var(--ds-button-font, var(--ds-text-12-16-medium)); }
.size32 { height: var(--ds-size-32); padding-inline: var(--ds-space-12); font: var(--ds-button-font, var(--ds-text-14-20-medium)); }
.size40 { height: var(--ds-size-40); padding-inline: var(--ds-space-16); font: var(--ds-button-font, var(--ds-text-16-24-medium)); }
.size48 { height: var(--ds-size-48); padding-inline: var(--ds-space-20); font: var(--ds-button-font, var(--ds-text-18-28-medium)); }
```

`ember.ts` — export the overrides map and register it:

```ts
/** D34 component-token overrides — emitted at [data-ds-theme="ember"] in ds.components. */
export const emberComponentOverrides: Record<string, string> = {
  "button-font": "var(--ds-text-mono-15-24-regular)",
};
```

Registration: `ember: { …, componentOverrides: emberComponentOverrides }`. `guidance.ts` rules array — append:

```ts
    "--ds-button-font overrides button typography across all sizes (documented D34 override; ember → mono).",
```

- [ ] **Step 4: Verify** — tests; build; `grep -n "button-font" packages/tokens/dist/ember.css` shows the override inside `@layer ds.components`.
- [ ] **Step 5: Commit** `feat(tokens,react): --ds-button-font brand override; ember buttons go mono (D34)`.

### Task 22: Card

**Files:** Create `packages/tokens/src/components/card.ts`, `packages/react/src/Card/Card.tsx`, `Card/card.module.css`, `Card/Card.test.tsx`, `Card/Card.stories.tsx`; modify `scripts/build.ts:135-143` (componentVars), `packages/react/src/index.ts`, `packages/react/scripts/emit-manifest.ts` (COMPONENTS), `packages/tokens/src/themes/customers/ember.ts` (card-radius 0)

- [ ] **Step 1: Failing tests** (`Card.test.tsx`):

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card.js";

describe("Card", () => {
  it("renders children in the body", () => {
    render(<Card><p>Body copy</p></Card>);
    expect(screen.getByText("Body copy")).toBeInTheDocument();
  });
  it("renders the media slot", () => {
    render(<Card media={<img alt="cover" src="x.jpg" />}>text</Card>);
    expect(screen.getByAltText("cover")).toBeInTheDocument();
  });
  it("applies featured and hoverLift classes", () => {
    const { container } = render(<Card variant="featured" hoverLift>x</Card>);
    expect(container.firstElementChild!.className).toMatch(/featured/);
    expect(container.firstElementChild!.className).toMatch(/hoverLift/);
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** `card.ts`:

```ts
/** Card component tokens (--ds-card-*). Layout shell, not a link (WS5). */
export const cardVars: Record<string, string> = {
  border: "var(--ds-border-faint)",
  bg: "transparent",
  gap: "var(--ds-space-16)",
  radius: "var(--ds-radius-8)",
};
```

`build.ts` componentVars map: `card: cardVars,` (+ import). `Card.tsx`:

```tsx
import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./card.module.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** stacked = media above body; featured = media beside body (~1.6fr/1fr), stacks under md. @default "stacked" */
  variant?: "stacked" | "featured";
  /** Media slot rendered edge-to-edge (img, AspectRatio, …). */
  media?: ReactNode;
  /** Lift on hover: translateY(-6px) over --ds-duration-350. @default false */
  hoverLift?: boolean;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement>;
}

export function Card({
  variant = "stacked",
  media,
  hoverLift = false,
  className,
  children,
  ref,
  ...rest
}: CardProps) {
  const cls = [
    styles.card,
    variant === "featured" ? styles.featured : styles.stacked,
    hoverLift ? styles.hoverLift : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={cls} {...rest}>
      {media != null && <div className={styles.media}>{media}</div>}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
```

`card.module.css`:

```css
.card {
  background: var(--ds-card-bg);
  border: 1px solid var(--ds-card-border);
  border-radius: var(--ds-card-radius);
  overflow: hidden;
}

.stacked { display: flex; flex-direction: column; gap: var(--ds-card-gap); }

.featured {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: var(--ds-card-gap);
  align-items: start;
}

/* breakpoints.md = 960 (D31: build-time constant, baked). */
@media (max-width: 960px) {
  .featured { grid-template-columns: 1fr; }
}

.media { min-width: 0; }
.body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ds-card-gap);
  padding: var(--ds-card-gap);
}

.hoverLift { transition: transform var(--ds-duration-350) var(--ds-ease-standard); }
.hoverLift:hover { transform: translateY(-6px); }
```

`index.ts`: `export { Card } from "./Card/Card.js"; export type { CardProps } from "./Card/Card.js";`. `emit-manifest.ts` COMPONENTS: add `"Card"`. `ember.ts` componentOverrides: `"card-radius": "0",` (portfolio cards are square). Stories: `Stacked`, `Featured` (with `<img>` media), `HoverLift`.

- [ ] **Step 4: Verify** — react tests, `pnpm lint:css`, `pnpm build` (manifest + docs regenerate; docgen must not report empty props — the build fails loudly if so).
- [ ] **Step 5: Commit** `feat(react,tokens): Card component with stacked/featured variants (WS5)`.

### Task 23: NavBar

**Files:** Create `packages/tokens/src/components/navbar.ts`, `packages/react/src/NavBar/NavBar.tsx`, `NavBar/navbar.module.css`, `NavBar/NavBar.test.tsx`, `NavBar/NavBar.stories.tsx`; modify `scripts/build.ts`, `packages/react/src/index.ts`, `emit-manifest.ts`

- [ ] **Step 1: Failing tests:**

```tsx
describe("NavBar", () => {
  it("renders brand, links, and actions slots", () => {
    render(
      <NavBar brand={<a href="/">DK</a>} actions={<button>Theme</button>}>
        <a href="#work">Work</a>
      </NavBar>,
    );
    expect(screen.getByText("DK")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toContainElement(screen.getByText("Work"));
    expect(screen.getByText("Theme")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** `navbar.ts`:

```ts
/** NavBar component tokens (--ds-navbar-*). bg defaults to the heavy scrim
 * (page canvas @ 0.82) — the blur-backed sticky-header treatment. */
export const navbarVars: Record<string, string> = {
  height: "4rem",
  bg: "var(--ds-scrim-heavy)",
  blur: "12px",
  border: "var(--ds-border-faint)",
};
```

`NavBar.tsx`:

```tsx
import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./navbar.module.css";

export interface NavBarProps extends HTMLAttributes<HTMLElement> {
  /** Brand slot (wordmark / logo link), leading edge. */
  brand?: ReactNode;
  /** Trailing actions slot (theme switch, CTA). */
  actions?: ReactNode;
  /** Nav links. */
  children?: ReactNode;
  /** Forwarded ref to the header element. */
  ref?: Ref<HTMLElement>;
}

export function NavBar({ brand, actions, children, className, ref, ...rest }: NavBarProps) {
  const cls = [styles.navbar, className].filter(Boolean).join(" ");
  return (
    <header ref={ref} className={cls} {...rest}>
      <div className={`ds-container ${styles.inner}`}>
        {brand != null && <div className={styles.brand}>{brand}</div>}
        <nav className={styles.links}>{children}</nav>
        {actions != null && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
```

`navbar.module.css`:

```css
.navbar {
  position: sticky;
  top: 0;
  z-index: var(--ds-z-nav);
  background: var(--ds-navbar-bg);
  backdrop-filter: blur(var(--ds-navbar-blur));
  -webkit-backdrop-filter: blur(var(--ds-navbar-blur));
  border-bottom: 1px solid var(--ds-navbar-border);
}

.inner {
  display: flex;
  align-items: center;
  gap: var(--ds-space-24);
  height: var(--ds-navbar-height);
}

.brand { display: flex; align-items: center; }
.links {
  display: flex;
  align-items: center;
  gap: var(--ds-space-20);
  margin-inline-start: auto;
}
.actions { display: flex; align-items: center; gap: var(--ds-space-8); }
```

Wire: `build.ts` componentVars `navbar: navbarVars`; index export; manifest `"NavBar"`. Story: sticky bar with wordmark + 3 links + Button action inside a tall scrollable decorator.

- [ ] **Step 4: Verify** — tests, lint (`--ds-z-nav` passes via `z` prefix; `--ds-navbar-*` own tokens), build.
- [ ] **Step 5: Commit** `feat(react,tokens): NavBar sticky header component (WS5)`.

### Task 24: AspectRatio

**Files:** Create `packages/react/src/AspectRatio/AspectRatio.tsx`, `aspect-ratio.module.css`, `AspectRatio.test.tsx`, `AspectRatio.stories.tsx`; modify `packages/react/src/index.ts`, `emit-manifest.ts`

- [ ] **Step 1: Failing tests:**

```tsx
describe("AspectRatio", () => {
  it("applies the ratio as inline style", () => {
    const { container } = render(<AspectRatio ratio={16 / 10}><img alt="shot" src="x.jpg" /></AspectRatio>);
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe(String(16 / 10));
  });
  it("renders the child", () => {
    render(<AspectRatio ratio={4 / 5}><img alt="portrait" src="y.jpg" /></AspectRatio>);
    expect(screen.getByAltText("portrait")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** `AspectRatio.tsx`:

```tsx
import type { HTMLAttributes, Ref } from "react";
import styles from "./aspect-ratio.module.css";

export interface AspectRatioProps extends HTMLAttributes<HTMLDivElement> {
  /** Width/height ratio, e.g. 16/10 or 4/5. */
  ratio: number;
  /** Forwarded ref to the frame element. */
  ref?: Ref<HTMLDivElement>;
}

export function AspectRatio({ ratio, className, style, children, ref, ...rest }: AspectRatioProps) {
  const cls = [styles.frame, className].filter(Boolean).join(" ");
  return (
    <div ref={ref} className={cls} style={{ aspectRatio: String(ratio), ...style }} {...rest}>
      {children}
    </div>
  );
}
```

`aspect-ratio.module.css`:

```css
.frame { overflow: hidden; }
.frame > :global(img),
.frame > :global(video) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
```

Wire index export + manifest `"AspectRatio"`. Stories: `Wide` (16/10) and `Portrait` (4/5) with placeholder images.

- [ ] **Step 4: Verify** — tests, lint, build. **Step 5: Commit** `feat(react): AspectRatio media frame (WS5)`.

### Task 25: Media tint token + utility (D35)

**Files:** Create `packages/tokens/src/components/media.ts`; modify `scripts/build.ts`, `scripts/emit-utilities.ts`, `src/themes/customers/ember.ts`, `src/guidance.ts`; test `__tests__/scales.test.ts`, `__tests__/ember-theme.test.ts`

- [ ] **Step 1: Failing tests.** scales.test.ts:

```ts
it("emits the .ds-media-tint utility with hover reveal (D35)", () => {
  const css = emitUtilitiesCSS();
  expect(css).toContain(".ds-media-tint { filter: var(--ds-media-tint); transition: filter var(--ds-duration-450) var(--ds-ease-soft); }");
  expect(css).toContain(".ds-media-tint:hover, .ds-media-tint:focus-visible { filter: none; }");
});
```

ember-theme.test.ts:

```ts
it("ember defines the sepia media tint (D35)", () => {
  expect(customerThemes.ember.componentOverrides?.["media-tint"]).toBe(
    "grayscale(1) sepia(0.65) saturate(1.6) hue-rotate(-12deg) brightness(0.88) contrast(1.05)",
  );
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** `media.ts`:

```ts
/** Media treatment tokens (D35). --ds-media-tint is a brand-defined filter
 * chain; the .ds-media-tint utility applies it with hover reveal. */
export const mediaVars: Record<string, string> = {
  tint: "none",
};
```

`build.ts` componentVars: `media: mediaVars`. `emitUtilitiesCSS` before the reduced-motion block:

```ts
  lines.push("");
  lines.push(`  .ds-media-tint { filter: var(--ds-media-tint); transition: filter var(--ds-duration-450) var(--ds-ease-soft); }`);
  lines.push(`  .ds-media-tint:hover, .ds-media-tint:focus-visible { filter: none; }`);
```

`emberComponentOverrides` gains:

```ts
  "media-tint": "grayscale(1) sepia(0.65) saturate(1.6) hue-rotate(-12deg) brightness(0.88) contrast(1.05)",
```

`guidance.ts` — add:

```ts
  recipes: {
    mediaTint: "Apply .ds-media-tint to media elements; the brand defines --ds-media-tint (D35). Hover/focus reveals true color over --ds-duration-450 --ds-ease-soft.",
    sectionHeader: "SectionHeader ships as a recipe, not a component (v1.2 non-goal): baseline-aligned flex row — mono annotation (--ds-text-mono-14-20-regular, --ds-fg-accent) + h2 (.ds-display-32-32-extrabold) + optional trailing meta, border-bottom 1px var(--ds-border-faint), padding-bottom var(--ds-space-20).",
  },
```

- [ ] **Step 4: Verify** — tests, build; `grep -n "media-tint" packages/tokens/dist/ember.css`. **Step 5: Commit** `feat(tokens): media tint token + utility; ember sepia chain (D35)`.

### Task 26: Icons — arrows + social (D36)

**Files:** Create `packages/react/src/icons/IconArrowDown.tsx`, `IconArrowUpRight.tsx`, `IconLinkedIn.tsx`, `IconGitHub.tsx`, `IconX.tsx`, `IconInstagram.tsx`; modify `icons/index.ts`, `src/index.ts`, `icons/icons.test.tsx`, `icons/icons.stories.tsx`

- [ ] **Step 1: Failing test** — extend the icon list in `icons.test.tsx` (it iterates exported icons; add the six new names to its list/imports).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** Stroke icons follow the `IconCheck` pattern exactly:

```tsx
// IconArrowDown.tsx
export function IconArrowDown({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}
```

```tsx
// IconArrowUpRight.tsx — paths:
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
```

```tsx
// IconInstagram.tsx — paths:
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
```

Filled brand glyphs (monochrome, `currentColor`, D36) use `fill` instead of stroke:

```tsx
// IconGitHub.tsx
export function IconGitHub({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
```

```tsx
// IconLinkedIn.tsx — same shape, path:
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
```

```tsx
// IconX.tsx — same shape, path:
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
```

Add all six to `icons/index.ts` and `src/index.ts` exports, and to the gallery in `icons.stories.tsx`.

- [ ] **Step 4: Verify** — icon tests pass; visual check in Storybook gallery. **Step 5: Commit** `feat(react): arrow + social icons (D36)`.

### Task 27: WS5 Storybook sweep + docs regeneration

**Files:** Modify `packages/react/src/Button/Button.stories.tsx` (ensure outline/href stories exist), verify `Card/NavBar/AspectRatio` stories; run full regeneration

- [ ] **Step 1: Build everything** — `pnpm build` (regenerates components.css, manifest.json with Card/NavBar/AspectRatio, per-component docs). Verify: `grep -l "NavBar" packages/react/dist/manifest.json packages/react/docs/*.md`.
- [ ] **Step 2: Storybook under ember** — `pnpm --filter storybook dev`, switch toolbar to Ember: Button (mono labels, square-ish), Card (radius 0), NavBar (dark scrim), all 8 original components render legibly. Fix any regression at its source.
- [ ] **Step 3: Full gate** — `pnpm build && pnpm test && pnpm lint`.
- [ ] **Step 4: Commit** `docs(storybook,react): WS5 stories + regenerated manifest/docs`.

**Milestone 5 gate:** all of the above green; contrast gate includes outline label pair via `(fgOnAccent, fillAccent)` in all four themes.

---

# Milestone 6 — WS6: Consumer pilot (promo + portfolio)

### Task 28: Preview infrastructure + baseline screenshots

**Files:** Create `/Users/dmytrokurkin/Projects/dku/.claude/launch.json`; create `docs/superpowers/plans/assets/2026-07-09-site-scale/`

- [ ] **Step 1: launch.json** (session cwd is `~/Projects/dku`, parent of both repos):

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "promo", "runtimeExecutable": "pnpm", "runtimeArgs": ["-C", "ds", "--filter", "promo", "dev"], "port": 5199 },
    { "name": "portfolio", "runtimeExecutable": "python3", "runtimeArgs": ["-m", "http.server", "4173", "-d", "portfolio"], "port": 4173 }
  ]
}
```

- [ ] **Step 2: Baseline captures** (pre-migration state) via headless Chrome into the assets dir:

```bash
mkdir -p ds/docs/superpowers/plans/assets/2026-07-09-site-scale
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
A=ds/docs/superpowers/plans/assets/2026-07-09-site-scale
"$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1440,2400 --screenshot="$A/promo-before-1440.png" "http://localhost:5199"
"$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=375,2400  --screenshot="$A/promo-before-375.png"  "http://localhost:5199"
"$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1440,3200 --screenshot="$A/portfolio-before-1440.png" "http://localhost:4173"
"$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=375,3200  --screenshot="$A/portfolio-before-375.png"  "http://localhost:4173"
```

(Servers started via preview tooling first; portfolio serves `index.html` on its `main`-equivalent state — the pilot branch isn't created yet.)

- [ ] **Step 3: Commit** (screenshots only; launch.json is outside the repos) — `git add docs/superpowers/plans/assets && git commit -m "docs(plan): WS6 baseline screenshots (1440/375)"`

### Task 29: Promo migration

**Files:** Modify `apps/promo/src/promo.css`

Exact replacements (spec WS6 promo list — everything else stays local):

- [ ] **Step 1: `:root` block** — delete `--promo-container`, `--promo-display`, `--promo-h2`, `--promo-ease`; keep pad-x, section-gap, hairlines, shadow (shadows deferred).
- [ ] **Step 2: Apply value swaps:**

| Location | Old | New |
|---|---|---|
| `.container` | `max-width: var(--promo-container)` | `max-width: var(--ds-container-max)` |
| `body` | `transition: background-color 0.25s var(--promo-ease)` | `transition: background-color var(--ds-duration-200) var(--ds-ease-soft)` |
| `.site-header` | `z-index: 10` | `z-index: var(--ds-z-nav)` |
| `.site-header` | `background: color-mix(in oklab, var(--ds-bg-primary) 82%, transparent)` | `background: var(--ds-scrim-heavy)` |
| `.site-header` | `backdrop-filter: blur(12px)` (both lines) | `backdrop-filter: blur(var(--ds-navbar-blur))` |
| `.hero h1` | `font-size: var(--promo-display); line-height: 1.02; font-weight: 700; letter-spacing: -0.03em;` | `font: var(--ds-display-36-64-black); letter-spacing: -0.02em;` (keep `text-wrap: balance`) |
| `.section-head h2` | `font-size: var(--promo-h2); line-height: 1.1; font-weight: 700; letter-spacing: -0.02em;` | `font: var(--ds-display-32-32-extrabold); letter-spacing: -0.01em;` (keep `text-wrap`) |
| `.rise` | `animation: promo-rise 0.7s var(--promo-ease) both` | `animation: promo-rise var(--ds-duration-600) var(--ds-ease-soft) both` |

Note: display utilities aren't used here because promo headings are not uppercase — `font:` var + tracking only. Documented intentional shifts: container 1120→1312, hero max 76→64px/weight 700→900, h2 fluid→static 32px, rise 0.7→0.6s.

- [ ] **Step 3: Verify** — `grep -n "promo-container\|promo-display\|promo-h2\|promo-ease" apps/promo/src/promo.css` → no matches. Preview at 1440/375 (both viewports, light + dark + acme + hover states), console clean.
- [ ] **Step 4: After screenshots** — same commands as Task 28 with `promo-after-{1440,375}.png`.
- [ ] **Step 5: Commit** `refactor(promo): migrate --promo-* primitives to DS tokens (WS6)` (include the after screenshots).

### Task 30: Portfolio — branch, vendor, wiring

**Repo:** `~/Projects/dku/portfolio`. Read `AGENTS.md` first (working rules + activity-log requirement).

- [ ] **Step 1: Branch** — `git checkout docs/agents-md && git checkout -b ds-tokens-pilot` (AGENTS.md exists only on `docs/agents-md`; note in PR that it should merge after/with that branch).
- [ ] **Step 2: Vendor** —

```bash
mkdir -p vendor/dku-tokens
cp ~/Projects/dku/ds/packages/tokens/dist/{base,utilities,ember}.css vendor/dku-tokens/
```

- [ ] **Step 3: Wire `index.html`** — `<html lang="en" data-ds-theme="ember">`; in `<head>` before the inline `<style>`:

```html
<link rel="stylesheet" href="vendor/dku-tokens/base.css" />
<link rel="stylesheet" href="vendor/dku-tokens/ember.css" />
<link rel="stylesheet" href="vendor/dku-tokens/utilities.css" />
```

(Vendored CSS is `@layer`-ed; the portfolio's own unlayered styles always win conflicts — safe.)

- [ ] **Step 4: AGENTS.md** — amend the "single-file" working rule to note the vendored-tokens exception; add:

```markdown
- **Design tokens** are vendored from `@handamade/tokens` (`vendor/dku-tokens/`:
  base.css, ember.css, utilities.css; `<html data-ds-theme="ember">`). Resync:
  `cp ~/Projects/dku/ds/packages/tokens/dist/{base,utilities,ember}.css vendor/dku-tokens/`
  Never hand-edit vendored files.
- **Browser floor** (OKLCH relative color): Chrome/Edge 119+, Safari 18+, Firefox 128+.
```

- [ ] **Step 5: Verify + commit** — page still renders identically (tokens loaded but unused); commit `Vendor @handamade/tokens CSS (ember theme) + agent rules`.

### Task 31: Portfolio — normalization to DS tokens

**Files:** Modify `~/Projects/dku/portfolio/index.html` (inline CSS only; JS/canvas and `pulse-down` keyframe stay app-level per spec)

- [ ] **Step 1: Replace the `:root` bridge** — delete `--bg, --bg-footer, --ink, --ember, --line, --line-soft, --line-chip, --line-btn, --font-display, --font-serif, --font-mono, --max-w, --pad-x`; keep only `--nav-h: 65px;`. Delete the 960px-breakpoint `--pad-x: 24px` override (the vendored utilities gutter media query replaces it).
- [ ] **Step 2: Global var substitutions** (every occurrence in the `<style>` block):

| Old | New |
|---|---|
| `var(--bg)` | `var(--ds-bg-primary)` |
| `var(--bg-footer)` | `var(--ds-bg-secondary)` |
| `var(--ink)` | `var(--ds-fg-primary)` |
| `var(--ember)` as `color`/`border-color`/gradient text | `var(--ds-fg-accent)` |
| `var(--ember)` as `background` (btn hover, ::selection) | `var(--ds-fill-accent)` |
| `var(--line-soft)` (0.08) | `var(--ds-border-faint)` |
| `var(--line)` (0.12) | `var(--ds-border-faint)` |
| `rgba(243, 237, 230, 0.1)` (.thumb border) | `var(--ds-border-faint)` |
| `var(--line-chip)` (0.2) | `var(--ds-border-neutral)` |
| `var(--line-btn)` (0.35) | `var(--ds-border-strong)` |
| `var(--font-display)` | `var(--ds-font-display)` |
| `var(--font-serif)` | `var(--ds-font-serif)` |
| `var(--font-mono)` | `var(--ds-font-mono)` |
| `var(--max-w)` | `var(--ds-container-max)` |
| `var(--pad-x)` | `var(--ds-gutter)` |
| nav `background: rgba(12, 10, 9, 0.82)` | `var(--ds-scrim-heavy)` |
| hero gradient `#0c0a09 0%, rgba(12,10,9,0.25) 40%, rgba(12,10,9,0.35) 100%` | `var(--ds-bg-primary) 0%, var(--ds-scrim-soft) 40%, var(--ds-scrim-medium) 100%` |
| `filter: grayscale(1) sepia(0.65) …` | `filter: var(--ds-media-tint)` |
| nav `z-index: 50` | `z-index: var(--ds-z-nav)` (any lightbox/overlay literal → `var(--ds-z-overlay)`) |

- [ ] **Step 3: Typography** (replace `font-family` + `font-size` + `line-height` triplets with one `font:` shorthand; keep letter-spacing/transform lines):

| Selector | New |
|---|---|
| `.hero h1` (clamp 56/9vw/128, lh .95) | `font: var(--ds-display-56-128-black); letter-spacing: -0.02em;` |
| about h2 (clamp 36/5vw/64, lh 1.05) | `font: var(--ds-display-36-64-black); letter-spacing: -0.02em;` |
| `.section-head h2` (32px, fw 800) | `font: var(--ds-display-32-32-extrabold);` (keep `letter-spacing: -0.01em; text-transform: uppercase;`) |
| hero lede serif 20/30 | `font: var(--ds-text-serif-20-30-regular);` |
| `.card-desc` serif 18/28 | `font: var(--ds-text-serif-18-28-regular);` |
| `.past-card .card-desc` serif 17/26 | `font: var(--ds-text-serif-18-28-regular);` *(documented +1px shift)* |
| `.about-lede` serif 28/40 | `font: var(--ds-text-serif-28-40-regular);` |
| `.about-lede` @960 (23/34) | `font: var(--ds-text-serif-24-36-regular);` *(documented shift)* |
| about body serif 20/32 | `font: var(--ds-text-serif-20-32-regular);` |
| mono 13px (scroll-cue, chips, footer notes) | `font: var(--ds-text-mono-13-20-regular);` |
| mono 14px (nav links, section-num/range, card-note) | `font: var(--ds-text-mono-14-20-regular);` |
| mono 15px (.btn-download, hero kicker) | `font: var(--ds-text-mono-15-24-regular);` |

Card titles (26/34, 22/30, display-font) have no DS combo and are compositions — they keep literal sizes with `var(--ds-font-display)`.

- [ ] **Step 4: Motion + rhythm:**

| Old | New |
|---|---|
| `0.2s` in transitions | `var(--ds-duration-200)` |
| `0.35s` | `var(--ds-duration-350)` |
| `0.45s` | `var(--ds-duration-450)` |
| `0.4s` (about photo filter) | `var(--ds-duration-450)` *(documented shift)* |
| `0.6s` | `var(--ds-duration-600)` |
| `cubic-bezier(0.2, 0.6, 0.2, 1)` | `var(--ds-ease-soft)` |
| bare `ease` in those transitions | `var(--ds-ease-standard)` |
| `.inner` `padding: 120px … 0` | `padding: var(--ds-space-120) var(--ds-gutter) 0` |
| footer `margin-top: 140px` | `margin-top: var(--ds-space-144)` |
| @960 `.inner` padding-top 100px | `var(--ds-space-96)` |
| @960 footer margin-top 110px | `var(--ds-space-120)` |

Out of scope (stays literal, per spec): hero particle canvas JS, parallax JS, `pulse-down` keyframe + its 1.8s, `<meta name="theme-color">` hexes, image assets.

- [ ] **Step 5: Leftover audit:**

```bash
grep -n "rgba(243, 237, 230" index.html            # expect: no matches
grep -n "var(--bg\|var(--ink\|var(--ember\|var(--line\|var(--font-\|var(--max-w\|var(--pad-x" index.html   # expect: no matches
grep -nE "transition[^;]*[0-9]\.[0-9]+s" index.html # expect: no matches
grep -n "#ff7847\|#f3ede6\|#100d0b" index.html      # expect: only JS canvas / meta lines
```

- [ ] **Step 6: Commit** `Adopt @handamade/tokens: normalize colors, type, motion, layout to --ds-* (ember)`.

### Task 32: Portfolio verification + activity log

- [ ] **Step 1: Preview verification** at 1440 and 375: hero (particles + parallax running), nav scrim + blur, thumbnails sepia→color on hover, CTA hover (ember fill, dark label), footer surface `#100d0b`, no horizontal overflow at 375, console clean. Toggle `prefers-reduced-motion` (preview dark/motion emulation or macOS setting) — transitions collapse (duration tokens zeroed), `pulse-down` still governed by the portfolio's own reduced-motion block.
- [ ] **Step 2: After screenshots** — `portfolio-after-{1440,375}.png` into the ds assets dir (same Chrome commands); compare against `before` — only the documented normalizations (hairline 0.12→0.08, serif 17/26→18/28, 23/34→24/36, 0.4s→0.45s, rhythm 100/110/140→96/120/144, mono line-heights).
- [ ] **Step 3: Commit screenshots in ds repo** — `docs(plan): WS6 after screenshots`.
- [ ] **Step 4: AGENTS.md activity log** (newest-first) — append under `## Activity log`:

```markdown
### 2026-07-09 — DS tokens pilot (branch `ds-tokens-pilot`)
- Adopted `@handamade/tokens` (ember theme, CSS-only, no build step): vendored
  base/ember/utilities CSS, `data-ds-theme="ember"`, replaced hand-rolled
  `:root` vars with `--ds-*` (colors, hairlines, scrims, serif/mono/display
  type, durations/easings, container/gutter, section rhythm, media tint).
- Intentional normalizations per the WS6 table in the DS spec
  (2026-07-09-site-scale-and-portfolio-readiness-spec.md); verified 1440/375,
  before/after screenshots archived in the DS repo plan assets.
- Hero particles/parallax and `pulse-down` stay app-level; they now consume
  duration/ease tokens where applicable.
```

- [ ] **Step 5: Commit** `Update AGENTS.md: activity log for DS tokens pilot`. Do **not** push or open a PR yet — that's the user's call at review.

**Milestone 6 gate:** promo + portfolio visually verified at 1440/375; screenshots archived and referenced below; `pnpm build && pnpm test && pnpm lint` still green in ds.

## Screenshot archive (filled during M6)

| | Before | After |
|---|---|---|
| Promo 1440 | `assets/2026-07-09-site-scale/promo-before-1440.png` | `assets/2026-07-09-site-scale/promo-after-1440.png` |
| Promo 375 | `assets/2026-07-09-site-scale/promo-before-375.png` | `assets/2026-07-09-site-scale/promo-after-375.png` |
| Portfolio 1440 | `assets/2026-07-09-site-scale/portfolio-before-1440.png` | `assets/2026-07-09-site-scale/portfolio-after-1440.png` |
| Portfolio 375 | `assets/2026-07-09-site-scale/portfolio-before-375.png` | `assets/2026-07-09-site-scale/portfolio-after-375.png` |

---

# Milestone 7 — Release readiness

### Task 33: AI artifacts sweep + llms.txt

**Files:** Modify `packages/tokens/llms.txt`, `packages/react/llms.txt`; verify generated artifacts

- [ ] **Step 1:** `pnpm build` then verify each artifact carries the new surface:

```bash
node -e "const g=require('./packages/tokens/dist/guidance.json'); for (const k of ['fonts','motion','layout','recipes']) if (!g[k]) throw new Error(k); console.log('guidance ok')"
grep -c '"duration"' packages/tokens/dist/dtcg/light.json    # expect ≥ 1
test -f packages/tokens/dist/resolved/ember.json && echo ember ok
grep -o '"Card"\|"NavBar"\|"AspectRatio"' packages/react/dist/manifest.json | sort -u   # expect all three
ls packages/react/docs | grep -i -E "card|navbar|aspect"     # expect three doc files
```

- [ ] **Step 2: llms.txt updates.** tokens: mention themes `{light,dark,acme,ember}`, new categories (motion `--ds-duration-*`/`--ds-ease-*` + D30, layout `--ds-container-max`/`--ds-gutter`/`--ds-z-*` + breakpoints JS export, display combos, serif/mono text combos, scrims/borderFaint, `--ds-media-tint`), dark-first brands (`base: "dark"`), component overrides (D34). react: mention Button `href`/`outline`, Card, NavBar, AspectRatio, new icons.
- [ ] **Step 3: Commit** `docs: llms.txt covers site-scale surface; artifacts verified`.

### Task 34: Changeset

**Files:** Create `.changeset/site-scale-portfolio-readiness.md`

- [ ] **Step 1:**

```markdown
---
"@handamade/tokens": minor
"@handamade/react": minor
---

Site-scale & portfolio readiness (D27–D37): dark-first customer brands + ember
theme; font roles (sans/serif/mono/display) with brand assignment; fluid
display tier; serif/mono combos; motion tokens with reduced-motion zeroing;
layout tokens (container, gutter, breakpoints export, z-index) + .ds-container;
hairline/scrim alphas; Button href + outline variant + --ds-button-font; Card,
NavBar, AspectRatio; media-tint recipe; arrow + social icons.
```

- [ ] **Step 2: Commit** `chore: changeset for v0.2.0 (minor × 2)`.

### Task 35: Spec status + decision log

**Files:** Modify `docs/superpowers/specs/2026-07-09-site-scale-and-portfolio-readiness-spec.md`

- [ ] **Step 1:** `**Status:** Approved for planning` → `**Status:** Implemented (2026-07-09, branch site-scale-portfolio-readiness)`. Append to the decision log:

```markdown
- **D37** Solid accent labels bind to semantic `fgOnAccent` (default: fg-static-white; ember: fg-static-black formula). The gate pair follows the binding — adjusting `emberAccent` L for white would have required 0.724 → ~0.58, destroying the brand color for a pairing the brand never renders. Outline hover label reuses the accent binding (literal canvas-on-accent fails AA in default light 4.35 / dark 3.92).
```

- [ ] **Step 2: Commit** `docs: spec status Implemented; record D37`.

### Task 36: Finish the branch

- [ ] **Step 1:** Full final gate: `pnpm build && pnpm test && pnpm lint`.
- [ ] **Step 2:** Invoke **superpowers:finishing-a-development-branch** for `site-scale-portfolio-readiness` (ds repo) — and **stop for user review before any merge/PR**. The portfolio's `ds-tokens-pilot` branch likewise waits for review (its base `docs/agents-md` is itself unmerged).

---

## Self-review record

- **Spec coverage:** WS1→T1–T4; WS2→T5–T9; WS3→T10–T13; WS4→T14–T17; WS5→T18–T27; WS6→T28–T32; gates 5–7→T33–T36. Non-goals honored: no keyframes, no font files, no shadow ladder (promo keeps `--promo-shadow-1`), SectionHeader as recipe (T25 guidance), no React in portfolio.
- **Type consistency:** `assembleCustomerTheme` (T1) used in T4 test and build.ts; `BrandFonts` (T9) consumed by emit-css opts; `opts.componentOverrides` (T18) matches T21/T22/T25 ember keys (`button-font`, `card-radius`, `media-tint`); `comboFontVar`/`displayName` defined T7/T8, used in emitters; `fgOnAccent` camelCase → `--ds-fg-on-accent` via existing `camelToKebab`.
- **Gate order:** stylelint literal-duration rule lands with the migration it enforces (T12); z-literal rule lands with the tooltip migration (T17) because `--ds-z-*` doesn't exist before M4.
