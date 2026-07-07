# DS Remediation + AI Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gaps found in the 2026-07-06 design review (contrast-gate hole, half-implemented component-token layer, typography drift, broken packaging, Figma alpha loss, multi-brand collisions) and add the AI-readability layer (spec: "AI consumption" section, decisions 20–26).

**Architecture:** All fixes stay inside the existing single-resolver codegen model: new emitters (component vars, DTCG, guidance, manifest, docs) are added to the pipeline in `packages/tokens/scripts/build.ts` and a new `packages/react` build. Component CSS migrates to consume only component-level tokens, enforced by a custom stylelint rule.

**Tech Stack:** existing (pnpm, TypeScript, tsx, vitest, culori, React 19, CSS Modules, Storybook, changesets) + new devDeps: stylelint, react-docgen-typescript, eslint + typescript-eslint.

**Predecessor plan:** `2026-06-24-design-system-plan.md` — all 25 tasks executed. This plan supersedes its "polish" scope. Review findings referenced as (R1)…(R16) map to the 2026-07-06 review conversation; spec decisions as (D20)…(D26).

## Global Constraints

- Browser floor: Chrome/Edge 119+, Safari 18+, Firefox 128+ (relative color syntax) — spec decision 5.
- CSS prefix `--ds-`, class prefix `ds-`, npm scope `@dku`.
- React 19: `ref` as normal prop, no forwardRef; zero runtime deps in `@dku/react`.
- Pixel-true scale names, rem values; component `size` = `24 | 32 | 40 | 48` number literals.
- Component module CSS may reference ONLY: its own `--ds-{component}-*` tokens, scale tokens (`--ds-space-*`, `--ds-size-*`, `--ds-radius-*`, `--ds-text-*`, `--ds-font-*`). No semantic color tokens. Enforced by stylelint from Task 6 on. (IconButton is declared a consumer of `--ds-button-*` — it is visually a button.)
- Never hand-edit anything under `dist/`.
- Every task: tests first where a behavior changes, run `pnpm test` before commit, commit per task.
- Run all commands from repo root `/Users/dmytrokurkin/Projects/dku/ds`.

## Milestones

| # | Milestone | Tasks | Fixes |
|---|---|---|---|
| M1 | Contrast gate integrity | 1–3 | R1 (AA hole), R10 (sRGB compositing), R9 (ΔE warning) |
| M2 | Real component-token layer | 4–8 | R2 (principle 3), stylelint enforcement |
| M3 | Pixel-true typography | 9–10 | R3 (principles 2+4) |
| M4 | Packaging & tooling | 11–13 | R5 (unbuildable packages, broken exports, lint) |
| M5 | Figma sync fidelity | 14–15 | R4 (alpha loss, number vars, text styles, orphan names) |
| M6 | Multi-brand hardening | 16–17 | R6, R7 (palette collisions, scaffolder) |
| M7 | Component a11y polish | 18 | R8 (Tooltip Escape/delay, D26) |
| M8 | AI & docs layer | 19–24 | D23–D25, R11–R13 (docs, manifest, DTCG, llms.txt, theme-aware token docs) |

## File map (new/rewritten files only)

```
packages/tokens/
├── src/
│   ├── components/            button.ts REWRITE; input.ts, select.ts, checkbox.ts,
│   │                          switch.ts, tag.ts, tooltip.ts NEW — var-name → CSS value maps
│   ├── guidance.ts            NEW — variant intent + state derivation as data
│   ├── gamut.ts               NEW — ΔE>2 clamp warnings
│   ├── scales/typography.ts   REWRITE — combo list {fontSize, lineHeight, weight}
│   └── themes/customers/index.ts  NEW — customer theme registry
├── scripts/
│   ├── emit-components.ts     NEW — components/{name}.vars.css + components.css
│   ├── emit-dtcg.ts           NEW — dist/dtcg/{theme}.json
│   └── (build.ts, emit-css.ts, emit-json.ts, emit-types.ts, emit-utilities.ts MODIFY)
├── llms.txt, README.md        NEW
packages/react/
├── vite.config.ts, tsconfig.build.json, src/global.d.ts   NEW — library build
├── scripts/emit-manifest.ts, scripts/emit-docs.ts          NEW
├── llms.txt, README.md        NEW
├── (all *.module.css MODIFY; Tooltip.tsx MODIFY)
packages/figma-plugin/src/code.ts, ui.html                  MODIFY
apps/storybook/src/token-docs/*                             MODIFY — theme-aware
tools/stylelint-plugin-ds-tokens.mjs, .stylelintrc.json     NEW
eslint.config.js, llms.txt (root)                           NEW
```

---

## M1: Contrast Gate Integrity (Tasks 1–3)

### Task 1: Component-label contrast pairs + failing anchors fixed

Verified 2026-07-06: white on emerald L0.60 = 3.47 (default Tag success FAILS AA today); white on acme coral L0.65 = 3.55 (acme accent Button FAILS). Anchor targets verified passing: emerald L0.52 → 4.71, coral L0.55 → 5.36, mint L0.52 → 4.96. Dark-theme Tag warning needs a theme-invariant dark label → new `fgStaticBlack` token (D22).

**Files:**
- Modify: `packages/tokens/src/contrast-matrix.ts` (append pairs)
- Modify: `packages/tokens/src/themes/light.ts`, `packages/tokens/src/themes/dark.ts` (add `fgStaticBlack`)
- Modify: `packages/tokens/src/palettes/default.ts` (emerald), `packages/tokens/src/themes/customers/acme.ts` (coral, mint)
- Test: `packages/tokens/__tests__/contrast.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `packages/tokens/__tests__/contrast.test.ts`:

```ts
import { componentLabelPairs } from "../src/contrast-matrix.js";
import { acmePalette, acmeSlots } from "../src/themes/customers/acme.js";

describe("component label pairs", () => {
  it("includes solid-variant label pairs", () => {
    const key = (p: { fg: string; bg: string }) => `${p.fg}/${p.bg}`;
    const keys = componentLabelPairs.map(key);
    expect(keys).toContain("fgStaticWhite/fillAccent");
    expect(keys).toContain("fgStaticWhite/fillDanger");
    expect(keys).toContain("fgStaticWhite/fillSuccess");
    expect(keys).toContain("fgStaticBlack/fillWarning");
  });

  for (const [name, palette, slots] of [
    ["light", defaultPalette, defaultSlots],
    ["dark", defaultPalette, defaultSlots],
    ["acme", acmePalette, acmeSlots],
  ] as const) {
    it(`${name}: all component label pairs pass AA`, () => {
      const theme = name === "dark" ? darkTheme : lightTheme;
      const resolved = resolve(theme, palette, slots);
      const results = checkContrast(resolved, componentLabelPairs);
      expect(results.filter((r) => !r.pass)).toEqual([]);
    });
  }
});
```

- [ ] **Step 2: Run to verify failure** — `pnpm vitest run packages/tokens/__tests__/contrast.test.ts` → FAIL (`componentLabelPairs` not exported; then AA failures).

- [ ] **Step 3: Implement**

In `contrast-matrix.ts` append:

```ts
/** Solid component-variant labels on their variant backgrounds (spec: "every
 * button/tag label on its variant background ≥ 4.5"). Tint-variant labels are
 * already covered by the fg-on-tint pairs in wcagAAPairs. */
export const componentLabelPairs: ContrastPair[] = [
  { fg: "fgStaticWhite", bg: "fillAccent", minRatio: 4.5 },  // Button/IconButton/Tag accent, Checkbox/Switch checked
  { fg: "fgStaticWhite", bg: "fillDanger", minRatio: 4.5 },  // Button/IconButton/Tag danger
  { fg: "fgStaticWhite", bg: "fillSuccess", minRatio: 4.5 }, // Tag success
  { fg: "fgStaticBlack", bg: "fillWarning", minRatio: 4.5 }, // Tag warning (D22)
];
```

In BOTH `themes/light.ts` and `themes/dark.ts`, after `fgStaticWhite`:

```ts
  fgStaticBlack: token({ from: slot.ink, l: set(0.25), c: cap(0.03) }),
```

In `palettes/default.ts`: `emerald: { l: 0.52, c: 0.19, h: 155 },`
In `themes/customers/acme.ts`: `coral: { l: 0.55, c: 0.2, h: 30 },` and `mint: { l: 0.52, c: 0.15, h: 160 },`

- [ ] **Step 4: Wire into the build gate.** In `scripts/build.ts` change the import and the check:

```ts
import { checkContrast, wcagAAPairs, componentLabelPairs } from "../src/contrast-matrix.js";
// in the theme loop:
const contrastResults = checkContrast(resolved, [...wcagAAPairs, ...componentLabelPairs]);
```

- [ ] **Step 5: Run** `pnpm vitest run packages/tokens` then `pnpm --filter @dku/tokens build` → all pass, build green for light/dark/acme.
- [ ] **Step 6: Commit** — `fix(tokens): component-label contrast pairs; darken emerald/coral/mint anchors; add fg-static-black (D20-D22)`

### Task 2: Composite alpha in sRGB, not OKLCH-linear (R10)

Browsers composite alpha in gamma-encoded sRGB; `compositeOnBackground` currently blends L/C linearly in OKLCH and keeps fg hue — near-threshold pairs can mispass.

**Files:** Modify `packages/tokens/src/contrast-matrix.ts`; Test `packages/tokens/__tests__/contrast.test.ts`

- [ ] **Step 1: Failing test** — black at alpha 0.5 on white must composite to mid-gray:

```ts
import { compositeHex } from "../src/contrast-matrix.js";
it("composites in sRGB: 50% black on white = #808080", () => {
  expect(compositeHex("#000000", 0.5, "#ffffff")).toBe("#808080");
});
```

- [ ] **Step 2: Run → FAIL** (not exported).
- [ ] **Step 3: Implement** — replace `compositeOnBackground` body with sRGB blending and export the primitive:

```ts
import { rgb, formatHex, wcagContrast } from "culori";

export function compositeHex(fgHex: string, alpha: number, bgHex: string): string {
  const f = rgb(fgHex)!;
  const b = rgb(bgHex)!;
  return formatHex({
    mode: "rgb",
    r: f.r * alpha + b.r * (1 - alpha),
    g: f.g * alpha + b.g * (1 - alpha),
    b: f.b * alpha + b.b * (1 - alpha),
  });
}

function compositeOnBackground(fg: ResolvedToken, bg: ResolvedToken): string {
  const alpha = fg.oklch.alpha ?? 1;
  if (alpha >= 1) return fg.hex;
  return compositeHex(fg.hex, alpha, bg.hex);
}
```

Remove the now-unused `clampChroma` import if nothing else uses it in this file.

- [ ] **Step 4: Run full tokens tests + build** — if a previously-passing pair now fails, the sRGB math is exposing a real deficiency: adjust the offending theme formula (raise/lower L by 0.02 steps), re-run, and note the change in the commit body.
- [ ] **Step 5: Commit** — `fix(tokens): contrast compositing in sRGB to match browser rendering`

### Task 3: Gamut ΔE > 2 clamp warning (D19 completion, R9)

**Files:** Create `packages/tokens/src/gamut.ts`; Test `packages/tokens/__tests__/gamut.test.ts`; Modify `packages/tokens/scripts/build.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import { gamutWarnings } from "../src/gamut.js";
import { resolve } from "../src/dsl/resolver.js";
import { token, set, slot } from "../src/dsl/builders.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";

describe("gamutWarnings", () => {
  it("flags tokens clamped by more than deltaE 2", () => {
    const neon = { neon: { l: 0.8, c: 0.37, h: 150 } };
    const slots = { ...defaultSlots, accent: "neon" };
    const resolved = resolve(
      { hot: token({ from: slot.accent, l: set(0.8) }) },
      { ...defaultPalette, ...neon }, slots,
    );
    const warnings = gamutWarnings(resolved, { hot: token({ from: slot.accent, l: set(0.8) }) },
      { ...defaultPalette, ...neon }, slots);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/hot/);
  });

  it("default light theme produces no warnings", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    expect(gamutWarnings(resolved, lightTheme, defaultPalette, defaultSlots)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement `src/gamut.ts`** — recompute each token's *pre-clamp* OKLCH (same math as the resolver but without `clampChroma`), compare to the resolved value with `differenceCiede2000`, collect messages:

```ts
import { differenceCiede2000 } from "culori";
import type { Palette, SlotMap, ThemeDef } from "./dsl/types.js";
import type { ResolvedTheme } from "./dsl/resolver.js";

const dE = differenceCiede2000();

function applyOp(base: number, op?: { op: string; value: number }): number {
  if (!op) return base;
  if (op.op === "set") return op.value;
  if (op.op === "delta") return base + op.value;
  return Math.min(base, op.value); // cap
}

/** Warn when sRGB clamping moved a resolved value by ΔE2000 > 2 (D19). */
export function gamutWarnings(
  resolved: ResolvedTheme, theme: ThemeDef, palette: Palette, slots: SlotMap,
): string[] {
  const warnings: string[] = [];
  const raw = new Map<string, { l: number; c: number; h: number }>();

  function rawOf(name: string): { l: number; c: number; h: number } {
    const hit = raw.get(name);
    if (hit) return hit;
    const def = theme[name]!;
    const base = def.from.type === "slot"
      ? palette[(slots as Record<string, string>)[def.from.name]]!
      : rawOf(def.from.name);
    const val = {
      l: applyOp(base.l, def.l), c: applyOp(base.c, def.c), h: applyOp(base.h, def.h),
    };
    raw.set(name, val);
    return val;
  }

  for (const name of Object.keys(theme)) {
    const pre = { mode: "oklch" as const, ...rawOf(name) };
    const post = { mode: "oklch" as const, ...resolved[name]!.oklch };
    const d = dE(pre, post);
    if (d > 2) warnings.push(
      `${name}: clamped ΔE ${d.toFixed(1)} (${JSON.stringify(rawOf(name))} → hex ${resolved[name]!.hex}) — adjust the palette anchor`,
    );
  }
  return warnings;
}
```

- [ ] **Step 4: Wire into build.ts** (after `resolve`, non-fatal):

```ts
import { gamutWarnings } from "../src/gamut.js";
// in theme loop:
for (const w of gamutWarnings(resolved, themeDef, palette, slots)) {
  console.warn(`  GAMUT WARNING [${themeName}] ${w}`);
}
```

- [ ] **Step 5: Run tests + build → green, no warnings for shipped themes.**
- [ ] **Step 6: Commit** — `feat(tokens): deltaE>2 gamut clamp warnings in codegen (completes D19)`

---

## M2: Real Component-Token Layer (Tasks 4–8)

Design (fixes R2): component tokens are declared in generated `dist/components/{name}.vars.css` inside `@layer ds.components` on `:root, [data-ds-theme]`. Module CSS consumes ONLY those tokens; defaults AND hover/active derive from the same `--ds-{component}-*` var, so one override retunes everything (the spec's principle 3 contract, currently inverted). Hover/active use the documented chain L−0.04 / L−0.08 (Button neutral/ghost variants change visuals by ≤0.02 L — accepted, unifies the model).

### Task 4: Component-vars emitter + Button var map

**Files:**
- Rewrite: `packages/tokens/src/components/button.ts`
- Create: `packages/tokens/scripts/emit-components.ts`
- Modify: `packages/tokens/scripts/build.ts`
- Test: `packages/tokens/__tests__/button-tokens.test.ts` (rewrite), `packages/tokens/__tests__/emit-components.test.ts` (new)

- [ ] **Step 1: Failing test** `__tests__/emit-components.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";
import { buttonVars } from "../src/components/button.js";

describe("emitComponentVarsCSS", () => {
  it("emits ds.components layer with prefixed vars", () => {
    const css = emitComponentVarsCSS("button", buttonVars);
    expect(css).toContain("@layer ds.components");
    expect(css).toContain(":root, [data-ds-theme]");
    expect(css).toContain("--ds-button-accent-bg: var(--ds-fill-accent);");
    expect(css).toContain(
      "--ds-button-accent-bg-hover: oklch(from var(--ds-button-accent-bg) calc(l - 0.04) c h);",
    );
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Rewrite `src/components/button.ts`** as a flat var map (single source of truth; module CSS will contain NO values, only var refs):

```ts
/** Button component tokens (--ds-button-*). Values may reference semantic
 * tokens and the component's own tokens; hover/active derive from the
 * component's own bg so one override retunes all states (principle 3). */
export const buttonVars: Record<string, string> = {
  "accent-bg": "var(--ds-fill-accent)",
  "accent-bg-hover": "oklch(from var(--ds-button-accent-bg) calc(l - 0.04) c h)",
  "accent-bg-active": "oklch(from var(--ds-button-accent-bg) calc(l - 0.08) c h)",
  "accent-fg": "var(--ds-fg-static-white)",

  "accent-subtle-bg": "var(--ds-fill-tint-accent)",
  "accent-subtle-bg-hover": "oklch(from var(--ds-button-accent-subtle-bg) l c h / 0.18)",
  "accent-subtle-bg-active": "oklch(from var(--ds-button-accent-subtle-bg) l c h / 0.24)",
  "accent-subtle-fg": "var(--ds-fg-accent)",

  "neutral-bg": "var(--ds-fill-neutral3)",
  "neutral-bg-hover": "oklch(from var(--ds-button-neutral-bg) calc(l - 0.04) c h)",
  "neutral-bg-active": "oklch(from var(--ds-button-neutral-bg) calc(l - 0.08) c h)",
  "neutral-fg": "var(--ds-fg-primary)",

  "neutral-subtle-bg": "var(--ds-fill-neutral1)",
  "neutral-subtle-bg-hover": "oklch(from var(--ds-button-neutral-subtle-bg) calc(l - 0.04) c h)",
  "neutral-subtle-bg-active": "oklch(from var(--ds-button-neutral-subtle-bg) calc(l - 0.08) c h)",
  "neutral-subtle-fg": "var(--ds-fg-primary)",

  "ghost-bg": "transparent",
  "ghost-bg-hover": "var(--ds-fill-neutral3)",
  "ghost-bg-active": "var(--ds-fill-neutral4)",
  "ghost-fg": "var(--ds-fg-primary)",

  "danger-bg": "var(--ds-fill-danger)",
  "danger-bg-hover": "oklch(from var(--ds-button-danger-bg) calc(l - 0.04) c h)",
  "danger-bg-active": "oklch(from var(--ds-button-danger-bg) calc(l - 0.08) c h)",
  "danger-fg": "var(--ds-fg-static-white)",

  "danger-subtle-bg": "var(--ds-fill-tint-danger)",
  "danger-subtle-bg-hover": "oklch(from var(--ds-button-danger-subtle-bg) l c h / 0.18)",
  "danger-subtle-bg-active": "oklch(from var(--ds-button-danger-subtle-bg) l c h / 0.24)",
  "danger-subtle-fg": "var(--ds-fg-danger)",

  "focus-ring": "var(--ds-border-focus)",
};
```

Keep exporting `type ButtonVariant` (unchanged union) for the types emitter.

- [ ] **Step 4: Create `scripts/emit-components.ts`**:

```ts
export function emitComponentVarsCSS(
  component: string, vars: Record<string, string>,
): string {
  const lines = Object.entries(vars).map(
    ([k, v]) => `    --ds-${component}-${k}: ${v};`,
  );
  return `@layer ds.components {\n  :root, [data-ds-theme] {\n${lines.join("\n")}\n  }\n}\n`;
}
```

- [ ] **Step 5: Wire into `build.ts`** — after theme emission:

```ts
import { mkdirSync } from "node:fs"; // already imported
import { emitComponentVarsCSS } from "./emit-components.js";
import { buttonVars } from "../src/components/button.js";

const componentVars: Record<string, Record<string, string>> = { button: buttonVars };
const componentsDir = join(distDir, "components");
mkdirSync(componentsDir, { recursive: true });
const aggregate: string[] = [];
for (const [name, vars] of Object.entries(componentVars)) {
  const css = emitComponentVarsCSS(name, vars);
  writeFileSync(join(componentsDir, `${name}.vars.css`), css);
  aggregate.push(css);
  console.log(`  wrote dist/components/${name}.vars.css`);
}
writeFileSync(join(distDir, "components.css"), aggregate.join("\n"));
```

Add export to `packages/tokens/package.json`: `"./components.css": "./dist/components.css"`.

- [ ] **Step 6: Rewrite `__tests__/button-tokens.test.ts`** to assert the var map (every variant has bg/bg-hover/bg-active/fg keys; hover/active reference `--ds-button-{variant}-bg`), delete assertions about the old `buttonTokens` record.
- [ ] **Step 7: Run tokens tests + build; verify `dist/components/button.vars.css` exists. Commit** — `feat(tokens): component-vars emitter; button tokens become the single source (R2)`

### Task 5: Button + IconButton CSS consume only component tokens

**Files:** Modify `packages/react/src/Button/button.module.css`, `packages/react/src/IconButton/icon-button.module.css`, `apps/storybook/.storybook/preview.ts`

- [ ] **Step 1:** In `preview.ts`, after the theme CSS imports add `import "@dku/tokens/components.css";`
- [ ] **Step 2:** Rewrite every variant block in `button.module.css` to the pattern (all seven variants, no `var(--ds-fill-*)`/`var(--ds-fg-*)` left):

```css
.accent {
  background: var(--ds-button-accent-bg);
  color: var(--ds-button-accent-fg);
}
.accent:hover:not(:disabled) { background: var(--ds-button-accent-bg-hover); }
.accent:active:not(:disabled) { background: var(--ds-button-accent-bg-active); }
```

Variant → prefix mapping: `.accent`→`accent`, `.accentSubtle`→`accent-subtle`, `.neutral`→`neutral`, `.neutralSubtle`→`neutral-subtle`, `.ghost`→`ghost`, `.danger`→`danger`, `.dangerSubtle`→`danger-subtle`. Focus rule becomes `outline: 2px solid var(--ds-button-focus-ring);`.

- [ ] **Step 3:** Same rewrite in `icon-button.module.css` — IconButton has variants accent/neutral/ghost/danger; map each to the same `--ds-button-*` tokens (constraint: IconButton is a declared consumer of button tokens). Focus rule → `var(--ds-button-focus-ring)`.
- [ ] **Step 4:** Run `pnpm test` (component tests are class/behavior based — must stay green) and start Storybook (`pnpm dev`), verify Button/IconButton render identically in light/dark/acme and that setting `--ds-button-accent-bg: purple` on a story wrapper retunes bg AND hover/active.
- [ ] **Step 5: Commit** — `fix(react): Button/IconButton consume only --ds-button-* tokens; override retunes all states`

### Task 6: Stylelint enforcement of the token rule

**Files:** Create `tools/stylelint-plugin-ds-tokens.mjs`, `.stylelintrc.json`; Modify root `package.json`

- [ ] **Step 1:** `pnpm add -D -w stylelint`
- [ ] **Step 2: Create the plugin** `tools/stylelint-plugin-ds-tokens.mjs`:

```js
import stylelint from "stylelint";

const ruleName = "ds/component-tokens-only";
const ALLOWED_GLOBAL = /^--ds-(space|size|radius|text|font)-/;
// componentName derived from filename: button.module.css → button; icon-button → button (declared alias)
const ALIASES = { "icon-button": "button" };

const rule = (enabled) => (root, result) => {
  if (!enabled) return;
  const file = root.source?.input.file ?? "";
  const m = file.match(/([a-z-]+)\.module\.css$/);
  if (!m) return;
  const component = ALIASES[m[1]] ?? m[1];
  const own = new RegExp(`^--ds-${component}-`);
  root.walkDecls((decl) => {
    for (const varName of decl.value.matchAll(/var\((--ds-[a-z0-9-]+)/g)) {
      const name = varName[1];
      if (!own.test(name) && !ALLOWED_GLOBAL.test(name)) {
        stylelint.utils.report({
          ruleName, result, node: decl,
          message: `${name} is not a --ds-${component}-* or scale token (ds/component-tokens-only)`,
        });
      }
    }
  });
};
rule.ruleName = ruleName;
rule.messages = stylelint.utils.ruleMessages(ruleName, {});
export default stylelint.createPlugin(ruleName, rule);
```

- [ ] **Step 3: Create `.stylelintrc.json`**:

```json
{
  "plugins": ["./tools/stylelint-plugin-ds-tokens.mjs"],
  "rules": { "ds/component-tokens-only": true }
}
```

Root package.json scripts: `"lint:css": "stylelint 'packages/react/src/**/*.module.css'"`.

- [ ] **Step 4: Run `pnpm lint:css`** → Button/IconButton clean; the six unmigrated components FAIL — expected. Add them to a temporary `ignoreFiles` list in `.stylelintrc.json` and remove each entry as Tasks 7–8 migrate it (the tasks say when).
- [ ] **Step 5: Commit** — `feat(tooling): stylelint rule ds/component-tokens-only (spec convention, R2)`

### Task 7: Component tokens for Input, Select, Checkbox, Switch

**Files:** Create `packages/tokens/src/components/{input,select,checkbox,switch}.ts`; Modify `build.ts` registry, the four module.css files, `.stylelintrc.json`

- [ ] **Step 1: Define the four var maps** (each in its own file, same shape as `buttonVars`):

```ts
// input.ts
export const inputVars: Record<string, string> = {
  bg: "var(--ds-bg-primary)",
  fg: "var(--ds-fg-primary)",
  placeholder: "var(--ds-fg-tertiary)",
  border: "var(--ds-border-neutral)",
  "border-hover": "var(--ds-border-strong)",
  "border-error": "var(--ds-fg-danger)",
  "focus-ring": "var(--ds-border-focus)",
};
// select.ts — selectVars: identical keys/values to inputVars, plus:
//   "chevron-fg": "var(--ds-fg-secondary)"
// checkbox.ts
export const checkboxVars: Record<string, string> = {
  fg: "var(--ds-fg-primary)",
  "box-bg": "var(--ds-bg-primary)",
  "box-border": "var(--ds-border-neutral)",
  "box-bg-checked": "var(--ds-fill-accent)",
  "box-border-checked": "var(--ds-fill-accent)",
  "check-fg": "var(--ds-fg-static-white)",
  "focus-ring": "var(--ds-border-focus)",
};
// switch.ts
export const switchVars: Record<string, string> = {
  fg: "var(--ds-fg-primary)",
  "track-bg": "var(--ds-fill-neutral4)",
  "track-bg-checked": "var(--ds-fill-accent)",
  "thumb-bg": "var(--ds-fg-static-white)",
  "focus-ring": "var(--ds-border-focus)",
};
```

- [ ] **Step 2:** Register all four in build.ts's `componentVars` record.
- [ ] **Step 3:** Migrate each module.css: replace every semantic `var(--ds-…)` with the matching component token from the map above (grep line references from the review: input 6,8,9,18,22,26,65,69; select 7,9,13,24,28,67,71; checkbox 12,43,45,53,54,70,77; switch 12,44,49,54,78 — plus each focus rule). Check the thumb color in switch.module.css: if it is a literal today, bind it to `--ds-switch-thumb-bg`. Remove each migrated file from stylelint `ignoreFiles`.
- [ ] **Step 4:** `pnpm lint:css` clean for these four; `pnpm test` green; Storybook visual check in all three themes.
- [ ] **Step 5: Commit** — `feat(tokens,react): component tokens for Input/Select/Checkbox/Switch`

### Task 8: Component tokens for Tag and Tooltip

**Files:** Create `packages/tokens/src/components/{tag,tooltip}.ts`; Modify build registry, `tag.module.css`, `tooltip.module.css`, `.stylelintrc.json`

- [ ] **Step 1: Var maps.** Tag solid variants pair each fill with its validated label token (Task 1); warning label switches from `fgPrimary` to the new static black (D22):

```ts
// tag.ts
export const tagVars: Record<string, string> = {
  "neutral-bg": "var(--ds-fill-neutral3)",   "neutral-fg": "var(--ds-fg-primary)",
  "accent-bg": "var(--ds-fill-accent)",      "accent-fg": "var(--ds-fg-static-white)",
  "success-bg": "var(--ds-fill-success)",    "success-fg": "var(--ds-fg-static-white)",
  "warning-bg": "var(--ds-fill-warning)",    "warning-fg": "var(--ds-fg-static-black)",
  "danger-bg": "var(--ds-fill-danger)",      "danger-fg": "var(--ds-fg-static-white)",
  "neutral-subtle-bg": "var(--ds-fill-neutral2)",     "neutral-subtle-fg": "var(--ds-fg-secondary)",
  "accent-subtle-bg": "var(--ds-fill-tint-accent)",   "accent-subtle-fg": "var(--ds-fg-accent)",
  "success-subtle-bg": "var(--ds-fill-tint-success)", "success-subtle-fg": "var(--ds-fg-success)",
  "warning-subtle-bg": "var(--ds-fill-tint-warning)", "warning-subtle-fg": "var(--ds-fg-warning)",
  "danger-subtle-bg": "var(--ds-fill-tint-danger)",   "danger-subtle-fg": "var(--ds-fg-danger)",
  "focus-ring": "var(--ds-border-focus)",
};
// tooltip.ts
export const tooltipVars: Record<string, string> = {
  bg: "var(--ds-fg-primary)",
  fg: "var(--ds-bg-primary)",
};
```

- [ ] **Step 2:** Register in build; migrate both CSS files (tag lines 40,47–95; tooltip lines 15–16); remove from `ignoreFiles` — the ignore list is now empty, delete the key.
- [ ] **Step 3:** `pnpm lint:css && pnpm test && pnpm --filter @dku/tokens build` all green; Storybook check — Tag warning label is now near-black in BOTH light and dark themes (intended, D22).
- [ ] **Step 4: Commit** — `feat(tokens,react): component tokens for Tag/Tooltip; tag warning label uses fg-static-black`

---

## M3: Pixel-True Typography (Tasks 9–10)

### Task 9: Combo-list typography scale + emitters (R3)

**Files:** Rewrite `packages/tokens/src/scales/typography.ts`; Modify `packages/tokens/scripts/emit-utilities.ts`; Test `packages/tokens/__tests__/scales.test.ts`

- [ ] **Step 1: Failing tests** — replace the typography section of `scales.test.ts`:

```ts
import { typographyCombos, comboName, WEIGHT_VALUES } from "../src/scales/typography.js";
import { emitScaleVarsCSS, emitUtilitiesCSS } from "../scripts/emit-utilities.js";

describe("typography combos", () => {
  it("names are pixel-true", () => {
    expect(comboName({ fontSize: 16, lineHeight: 24, weight: "regular" })).toBe("16-24-regular");
  });
  it("emits one font-shorthand var per combo", () => {
    const css = emitScaleVarsCSS();
    expect(css).toContain("--ds-text-16-24-regular: 400 1rem/1.5rem var(--ds-font-sans);");
    expect(css).not.toContain("--ds-text-xs");
  });
  it("emits one utility class per combo", () => {
    const css = emitUtilitiesCSS();
    expect(css).toContain(".ds-text-16-24-regular { font: var(--ds-text-16-24-regular); }");
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Rewrite `typography.ts`**:

```ts
export type Weight = "regular" | "medium" | "semibold" | "bold";
export const WEIGHT_VALUES: Record<Weight, number> = {
  regular: 400, medium: 500, semibold: 600, bold: 700,
};
export interface TypographyCombo { fontSize: number; lineHeight: number; weight: Weight; }
export const comboName = (c: TypographyCombo) => `${c.fontSize}-${c.lineHeight}-${c.weight}`;

/** Explicit combo list (spec principle 2/4): adding a combo is one line, never a rename. */
export const typographyCombos: TypographyCombo[] = [
  { fontSize: 12, lineHeight: 16, weight: "regular" },
  { fontSize: 12, lineHeight: 16, weight: "medium" },
  { fontSize: 14, lineHeight: 20, weight: "regular" },
  { fontSize: 14, lineHeight: 20, weight: "medium" },
  { fontSize: 16, lineHeight: 20, weight: "regular" },
  { fontSize: 16, lineHeight: 24, weight: "regular" },
  { fontSize: 16, lineHeight: 24, weight: "medium" },
  { fontSize: 18, lineHeight: 28, weight: "medium" },
  { fontSize: 20, lineHeight: 28, weight: "semibold" },
  { fontSize: 24, lineHeight: 32, weight: "medium" },
  { fontSize: 30, lineHeight: 36, weight: "bold" },
];
```

- [ ] **Step 4: Update `emit-utilities.ts`** typography loops:

```ts
// vars:
for (const c of typographyCombos) {
  lines.push(`    --ds-text-${comboName(c)}: ${WEIGHT_VALUES[c.weight]} ${pxToRem(c.fontSize)}/${pxToRem(c.lineHeight)} var(--ds-font-sans);`);
}
// utilities:
for (const c of typographyCombos) {
  lines.push(`  .ds-text-${comboName(c)} { font: var(--ds-text-${comboName(c)}); }`);
}
```

- [ ] **Step 5: Run tokens tests + build → green. Commit** — `feat(tokens)!: pixel-true typography combos --ds-text-{size}-{lh}-{weight} (principles 2+4, R3)`

### Task 10: Migrate component CSS + Storybook typography docs to combos

**Files:** Modify all `*.module.css` that use `--ds-text-*` (button, input, select, checkbox, switch, tag), `apps/storybook/src/token-docs/TypographyTokens.stories.tsx`

- [ ] **Step 1: Substitution table** — replace `font-size` + `line-height` (+ any hardcoded `font-weight`) pairs with one `font:` declaration:

| Old (size/line pair) | New single declaration |
|---|---|
| `xs` + `font-weight: 500` (button size24, tag) | `font: var(--ds-text-12-16-medium);` |
| `xs` (input/select size24, tooltip) | `font: var(--ds-text-12-16-regular);` |
| `sm` + 500 (button size32) | `font: var(--ds-text-14-20-medium);` |
| `sm` (input/select size32, checkbox, switch) | `font: var(--ds-text-14-20-regular);` |
| `base` + 500 (button size40) | `font: var(--ds-text-16-24-medium);` |
| `base` (input/select size40) | `font: var(--ds-text-16-24-regular);` |
| `lg` + 500 (button size48) | `font: var(--ds-text-18-28-medium);` |
| `lg` (input/select size48) | `font: var(--ds-text-18-28-medium);` |

Note: `font:` shorthand resets `font-family` — the combo vars embed `var(--ds-font-sans)`, so DELETE the now-redundant `font-family: var(--ds-font-sans)` lines in those blocks.

- [ ] **Step 2:** Update `TypographyTokens.stories.tsx` to iterate `typographyCombos` (import from `@dku/tokens` source is not available to storybook — read combo names from the emitted utilities/vars or add combos to the resolved JSON in Task 15's emit-json change; simplest now: hardcode iteration over `getComputedStyle(document.documentElement)` lookups of `--ds-text-*` is NOT acceptable — instead extend `emit-json.ts` HERE: add `"typography": typographyCombos.map(c => ({...c, name: comboName(c)}))` to the JSON payload and read it in the story).
- [ ] **Step 3:** `pnpm test && pnpm lint:css && pnpm --filter @dku/tokens build`; Storybook: typography specimen shows combo names, components render with correct sizes/weights.
- [ ] **Step 4: Commit** — `feat!: migrate components and docs to pixel-true typography combos`

---

## M4: Packaging & Tooling (Tasks 11–13)

### Task 11: @dku/react library build (R5)

**Files:** Create `packages/react/vite.config.ts`, `packages/react/tsconfig.build.json`, `packages/react/src/global.d.ts`; Modify `packages/react/package.json`

- [ ] **Step 1: `vite.config.ts`**:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: { entry: "src/index.ts", formats: ["es"], fileName: "index" },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: { assetFileNames: "styles[extname]" },
    },
    cssCodeSplit: false,
  },
});
```

- [ ] **Step 2: `tsconfig.build.json`** (types-only emit):

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx", "rootDir": "src", "outDir": "dist",
    "emitDeclarationOnly": true, "noEmit": false
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.tsx", "src/**/*.stories.tsx"]
}
```

`src/global.d.ts`: `declare module "*.module.css" { const c: Record<string, string>; export default c; }`

- [ ] **Step 3:** package.json: `"build": "vite build && tsc -p tsconfig.build.json"`, add `"files": ["dist", "docs", "README.md", "llms.txt"]`.
- [ ] **Step 4:** `pnpm --filter @dku/react build` → verify `dist/index.js`, `dist/styles.css`, `dist/index.d.ts` all exist; `node -e "import('./packages/react/dist/index.js').then(m => console.log(Object.keys(m).length))"` prints > 20.
- [ ] **Step 5: Commit** — `fix(react): working library build — ESM bundle, styles.css, type declarations`

### Task 12: @dku/tokens types artifact + export map fixes (R5)

**Files:** Modify `packages/tokens/scripts/emit-types.ts`, `scripts/build.ts`, `packages/tokens/package.json`

- [ ] **Step 1: Failing test** (in `__tests__/emit-css.test.ts` or new `emit-types.test.ts`): `emitTokenTypes(themes, [24,32,40,48], ["accent","ghost"])` output contains `export type Size = 24 | 32 | 40 | 48;` (numbers, no quotes) and `export type Variant = "accent" | "ghost";`.
- [ ] **Step 2:** Change `emitTokenTypes` signature to `(themes, sizes: number[] = [], variants: string[] = [])`; emit sizes unquoted. In build.ts call:

```ts
import { sizeScale } from "../src/scales/sizes.js";
import { ButtonVariant } from "../src/components/button.js"; // type only — keep a VARIANTS const:
```

Add to `src/components/button.ts`: `export const BUTTON_VARIANTS = ["accent","accent-subtle","neutral","neutral-subtle","ghost","danger","danger-subtle"] as const;` and pass `emitTokenTypes(themeDefs, [...sizeScale], [...BUTTON_VARIANTS])`.

- [ ] **Step 3:** Emit BOTH `dist/types/index.d.ts` (the unions) and `dist/types/index.js` (`export {};\n`) in build.ts. Fix package.json: `"./types": { "types": "./dist/types/index.d.ts", "import": "./dist/types/index.js" }`. Add `"files": ["dist", "README.md", "llms.txt"]`.
- [ ] **Step 4:** Build; verify `node -e "import('@dku/tokens/types')"` from `apps/storybook` cwd resolves. Commit — `fix(tokens): compileable ./types export with literal Size/Variant unions`

### Task 13: ESLint flat config (R5)

**Files:** Create `eslint.config.js`; Modify root `package.json`

- [ ] **Step 1:** `pnpm add -D -w eslint @eslint/js typescript-eslint`
- [ ] **Step 2: `eslint.config.js`**:

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/*.css"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { "@typescript-eslint/consistent-type-imports": "error" } },
);
```

- [ ] **Step 3:** `pnpm lint` runs; fix or `// eslint-disable-next-line` any surfaced issues (expect a handful of `no-explicit-any`-class findings; fix real ones, do not blanket-disable). Add `"lint:css"` to a combined `"lint": "eslint . && stylelint 'packages/react/src/**/*.module.css'"`.
- [ ] **Step 4: Commit** — `chore: eslint flat config; lint script actually works`

---

## M5: Figma Sync Fidelity (Tasks 14–15)

### Task 14: Alpha-correct color sync + named orphans (R4)

**Files:** Modify `packages/figma-plugin/src/code.ts`, `packages/figma-plugin/src/ui.html`

- [ ] **Step 1:** In `syncTokens`, build the color from hex + resolved alpha (hex is 6-digit, alpha lives in `oklch.alpha`):

```ts
const base = hexToFigmaRGB(token.hex);
const newColor: RGBA = { r: base.r, g: base.g, b: base.b, a: token.oklch.alpha ?? 1 };
```

- [ ] **Step 2:** Change `SyncResult.orphaned: number` to `orphanedNames: string[]` (collect names instead of counting); update the UI result renderer in `ui.html` to list them (`<li>` per name) under "Orphaned (not deleted)".
- [ ] **Step 3:** Build the plugin (`pnpm --filter figma-plugin build` — check the package name in its package.json), load in Figma on a scratch file, sync light theme twice: first run creates, second run reports all-unchanged; spot-check `fill/tint-accent` variable shows 12% alpha.
- [ ] **Step 4: Commit** — `fix(figma-plugin): preserve token alpha in variables; list orphan names`

### Task 15: Number variables + text styles in Figma (spec: Figma sync scope)

**Files:** Modify `packages/tokens/scripts/emit-json.ts` (extend payload), `packages/figma-plugin/src/code.ts`

- [ ] **Step 1:** Extend `emitResolvedJSON` payload (also satisfies Task 10 Step 2's docs need):

```ts
import { spacingScale } from "../src/scales/spacing.js";
import { sizeScale } from "../src/scales/sizes.js";
import { radiusScale } from "../src/scales/radius.js";
import { typographyCombos, comboName, WEIGHT_VALUES } from "../src/scales/typography.js";

return JSON.stringify({
  theme: themeName,
  tokens,
  scales: { space: [...spacingScale], size: [...sizeScale], radius: [...radiusScale] },
  typography: typographyCombos.map((c) => ({ name: comboName(c), ...c, cssWeight: WEIGHT_VALUES[c.weight] })),
}, null, 2);
```

- [ ] **Step 2:** Plugin: upsert FLOAT variables `space/{px}`, `size/{px}`, `radius/{px}` (value = px number, same collection, mode-independent — set for every mode) and text styles named `DS/{name}` via `figma.getLocalTextStylesAsync()` upsert-by-name; before setting font: `await figma.loadFontAsync({ family: "Inter", style: weightToStyle(c.weight) })` with `weightToStyle = {regular:"Regular", medium:"Medium", semibold:"Semi Bold", bold:"Bold"}`; set `fontSize`, `lineHeight: { unit: "PIXELS", value: c.lineHeight }`.
- [ ] **Step 3:** Manual verify in Figma (variables pane shows number groups; text styles list shows DS/16-24-regular etc.). Dry-run counts include the new kinds.
- [ ] **Step 4: Commit** — `feat(figma-plugin): sync number variables and text styles from resolved JSON`

---

## M6: Multi-Brand Hardening (Tasks 16–17)

### Task 16: Scope palette vars per theme (R6)

**Files:** Modify `packages/tokens/scripts/emit-css.ts`, `scripts/build.ts`; Test `__tests__/emit-css.test.ts`

- [ ] **Step 1: Failing test:** `emitThemeCSS("acme", lightTheme, acmePalette, acmeSlots)` output contains `--ds-palette-coral: oklch(` inside the `[data-ds-theme="acme"]` block; `emitBaseCSS` result for build no longer receives merged palettes (assert acme palette names absent from generated `dist/base.css` after build — filesystem assertion in the test using the emit functions directly is fine).
- [ ] **Step 2:** In `emitThemeCSS`, prepend palette var lines (reuse the loop from `emitBaseCSS`) inside the theme selector block, before semantic tokens. In `build.ts`, delete the `allPalettes` merge + regex injection; call `emitBaseCSS(defaultPalette)` and append `emitScaleVarsCSS()` by emitting scales as their own `:root` block string concatenated after the palette block (no regex surgery):

```ts
const baseCSS = emitBaseCSS(defaultPalette)
  + `\n@layer ds.base {\n  :root {\n${emitScaleVarsCSS()}\n  }\n}\n`;
```

- [ ] **Step 3:** Run tests + build; in Storybook switch to acme — colors identical to before (palette now scoped, not global). Two hypothetical customers with the same anchor name can no longer collide (scoped selectors).
- [ ] **Step 4: Commit** — `fix(tokens): scope brand palette vars to their theme selector; base.css carries default brand only`

### Task 17: Customer theme registry + scaffolder that finishes the job (R7)

**Files:** Create `packages/tokens/src/themes/customers/index.ts`; Modify `scripts/build.ts`, `scripts/new-theme.ts`, `src/themes/customers/acme.ts`

- [ ] **Step 1: Registry** `customers/index.ts`:

```ts
import type { Palette, SlotMap, ThemeDef } from "../../dsl/types.js";
import { acmePalette, acmeSlots } from "./acme.js";

export interface CustomerTheme {
  palette: Palette;
  slots: SlotMap;
  /** Optional semantic-token formula overrides, merged over lightTheme. */
  overrides?: ThemeDef;
}

export const customerThemes: Record<string, CustomerTheme> = {
  acme: { palette: acmePalette, slots: acmeSlots },
  // <ds:register — new-theme inserts here, do not remove>
};
```

- [ ] **Step 2:** build.ts consumes the registry instead of the hardcoded acme entry:

```ts
import { customerThemes } from "../src/themes/customers/index.js";
const themes: Record<string, ThemeConfig> = {
  light: { theme: lightTheme, palette: defaultPalette, slots: defaultSlots },
  dark: { theme: darkTheme, palette: defaultPalette, slots: defaultSlots },
  ...Object.fromEntries(Object.entries(customerThemes).map(([name, c]) => [
    name, { theme: { ...lightTheme, ...c.overrides }, palette: c.palette, slots: c.slots },
  ])),
};
```

- [ ] **Step 3:** `new-theme.ts`: after writing the theme file, insert the registration line before the `<ds:register` marker in `customers/index.ts` (string splice + writeFile), add an import line at the top, and prefix scaffolded palette names with the theme name (`{name}Ink`, `{name}Canvas`, `{name}Brand` — no more generic `dark/light/brand`). Update the success message: "Registered in customers/index.ts. Edit the palette, then pnpm build."
- [ ] **Step 4: Test:** run `pnpm --filter @dku/tokens new-theme zorp`, then `pnpm --filter @dku/tokens build` → `dist/zorp.css` exists and contrast gate ran against it. Delete zorp files + registry line afterwards. Also note: the package.json `"./acme.css"` export becomes a pattern problem — change exports to `"./themes/*.css": "./dist/*.css"`? NO — keep it simple: add `"./*.css": "./dist/*.css"` replacing the individual css entries (base/light/dark/acme/utilities/components all match). Update storybook imports if specifier paths change (they don't: `@dku/tokens/base.css` still matches).
- [ ] **Step 5: Commit** — `feat(tokens): customer theme registry with formula overrides; self-registering scaffolder`

---

## M7: Component A11y Polish (Task 18)

### Task 18: Tooltip — Escape dismiss + open delay (D26, R8)

**Files:** Modify `packages/react/src/Tooltip/Tooltip.tsx`; Test `packages/react/src/Tooltip/Tooltip.test.tsx`

- [ ] **Step 1: Failing tests:**

```tsx
it("closes on Escape while visible (WCAG 1.4.13)", async () => {
  const user = userEvent.setup();
  render(<Tooltip content="tip"><button>t</button></Tooltip>);
  await user.tab(); // focus shows immediately
  expect(await screen.findByRole("tooltip")).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
});

it("delays open on hover but not on focus", async () => {
  vi.useFakeTimers();
  // render, fireEvent.mouseEnter(trigger); advance 100ms → no tooltip; advance to 150ms → tooltip
  // fireEvent.focus(trigger) on a fresh render → tooltip immediately
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement:** add `const HOVER_DELAY_MS = 150;` and a `timerRef = useRef<number>`; `onMouseEnter` sets `timerRef.current = window.setTimeout(show, HOVER_DELAY_MS)`; `onMouseLeave` clears it + hides; `onFocus` shows immediately; `onBlur` clears + hides. Add `useEffect` that, while `visible`, listens for `keydown` Escape on `document` and hides; cleans up on hide/unmount. Clear the timer on unmount.
- [ ] **Step 4: Run react tests → green. Commit** — `fix(react): Tooltip Escape dismissal + 150ms hover delay (WCAG 1.4.13, D26)`

---

## M8: AI & Docs Layer (Tasks 19–24)

### Task 19: Usage guidance as data (D23)

**Files:** Create `packages/tokens/src/guidance.ts`; Modify `scripts/build.ts`; Test `packages/tokens/__tests__/guidance.test.ts`

- [ ] **Step 1: Failing test:** `guidance.variants` has 8 entries incl. `accent` with non-empty `intent`; `guidance.states.hover === "L - 0.04"`.
- [ ] **Step 2: Implement `src/guidance.ts`** — transcribe the spec's tables verbatim:

```ts
export const guidance = {
  variants: [
    { variant: "accent", intent: "Primary action, draws attention", typicalUse: "Submit, CTA, main action in a group" },
    { variant: "accent-subtle", intent: "Accent tone, lower visual weight", typicalUse: "Selected state, active filter, soft CTA" },
    { variant: "neutral", intent: "Default, structurally present", typicalUse: "Secondary actions, toolbar buttons" },
    { variant: "neutral-subtle", intent: "Minimal chrome", typicalUse: "Inline actions, table row actions" },
    { variant: "ghost", intent: "No visible container until hover", typicalUse: "Icon-only triggers, compact toolbars" },
    { variant: "danger", intent: "Destructive action", typicalUse: "Delete, remove, disconnect" },
    { variant: "danger-subtle", intent: "Destructive context, low urgency", typicalUse: "Warning badges, soft destructive hints" },
    { variant: "success | warning", intent: "Status communication (Tag only)", typicalUse: "Status badges, labels" },
  ],
  rules: [
    "One accent per visual group; everything else neutral or ghost.",
    "danger only for actions with real consequences.",
    "Sizes are px numbers (24|32|40|48), never S/M/L.",
    "Typography tokens are --ds-text-{size}-{lineHeight}-{weight}.",
    "Override component tokens (--ds-{component}-*), not semantic tokens, for one-off theming.",
  ],
  states: { hover: "L - 0.04", active: "L - 0.08", disabled: "element opacity 0.4 (keeps hue)", focus: "2px ring var(--ds-{component}-focus-ring)" },
  typographyDefaults: { body: "16-24-regular", compactUI: "14-20-regular", heading: "24-32-medium", caption: "12-16-regular" },
} as const;
```

- [ ] **Step 3:** build.ts: `writeFileSync(join(distDir, "guidance.json"), JSON.stringify(guidance, null, 2))`; package.json export `"./guidance.json": "./dist/guidance.json"`.
- [ ] **Step 4: Commit** — `feat(tokens): machine-readable usage guidance (guidance.json)`

### Task 20: DTCG export (D24)

**Files:** Create `packages/tokens/scripts/emit-dtcg.ts`; Modify `scripts/build.ts`; Test `packages/tokens/__tests__/emit-dtcg.test.ts`

- [ ] **Step 1: Failing test:** output for light theme parses as JSON; `doc.color.bg.primary.$type === "color"`; `$value` matches `/^#[0-9a-f]{6}/`; `doc.dimension.space["8"].$value === "0.5rem"`; every color token has `$description` containing its formula.
- [ ] **Step 2: Implement:**

```ts
import type { ResolvedTheme } from "../src/dsl/resolver.js";
import { camelToKebab } from "./emit-css.js";
import { spacingScale } from "../src/scales/spacing.js";
import { sizeScale } from "../src/scales/sizes.js";
import { radiusScale } from "../src/scales/radius.js";
import { typographyCombos, comboName, WEIGHT_VALUES } from "../src/scales/typography.js";

const GROUPS = ["bg", "fg", "fill", "border"] as const;

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
    },
    typography: Object.fromEntries(typographyCombos.map((c) => [comboName(c), {
      $type: "typography",
      $value: { fontFamily: "{fontFamily.sans}", fontSize: `${c.fontSize}px`, lineHeight: `${c.lineHeight}px`, fontWeight: WEIGHT_VALUES[c.weight] },
    }])),
    fontFamily: { sans: { $type: "fontFamily", $value: ["ui-sans-serif", "system-ui", "sans-serif"] } },
  }, null, 2);
}
```

- [ ] **Step 3:** build.ts: write `dist/dtcg/{theme}.json` per theme (mkdir `dtcgDir`); package.json export `"./dtcg/*": "./dist/dtcg/*"`.
- [ ] **Step 4: Commit** — `feat(tokens): W3C DTCG export per theme (D24)`

### Task 21: Component manifest emitter (D23)

**Files:** Create `packages/react/scripts/emit-manifest.ts`; Modify `packages/react/package.json`

- [ ] **Step 1:** `pnpm --filter @dku/react add -D react-docgen-typescript tsx`
- [ ] **Step 2: Implement:**

```ts
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { withCustomConfig } from "react-docgen-typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const COMPONENTS = ["Button", "IconButton", "Input", "Select", "Checkbox", "Switch", "Tag", "Tooltip"];

const parser = withCustomConfig(join(root, "tsconfig.json"), {
  propFilter: (prop) => !prop.parent?.fileName.includes("node_modules") || ["ref", "className"].includes(prop.name),
});

const manifest = COMPONENTS.map((name) => {
  const [doc] = parser.parse(join(root, "src", name, `${name}.tsx`));
  return {
    name,
    description: doc?.description ?? "",
    props: Object.values(doc?.props ?? {}).map((p) => ({
      name: p.name, type: p.type.name, required: p.required,
      default: p.defaultValue?.value ?? null, description: p.description,
    })),
  };
});

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "manifest.json"), JSON.stringify({ components: manifest }, null, 2));
console.log(`[react] wrote dist/manifest.json (${manifest.length} components)`);
```

- [ ] **Step 3:** package.json: `"build": "vite build && tsc -p tsconfig.build.json && tsx scripts/emit-manifest.ts"`, export `"./manifest.json": "./dist/manifest.json"`.
- [ ] **Step 4:** Build; inspect `dist/manifest.json` — Button entry lists `variant` with the 7-value union type string and default `"neutral"`. If docgen output is empty, add JSDoc to the missing prop — every exported prop must end with a description (add them now: each component's props already carry doc comments; fill any gaps).
- [ ] **Step 5: Commit** — `feat(react): component manifest.json generated via react-docgen-typescript`

### Task 22: Generated per-component docs (D23)

**Files:** Create `packages/react/scripts/emit-docs.ts`; Modify `packages/react/package.json`

- [ ] **Step 1: Implement** — render `docs/{Component}.md` from `dist/manifest.json` + `@dku/tokens/dist/guidance.json`:

```ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const { components } = JSON.parse(readFileSync(join(root, "dist/manifest.json"), "utf8"));
const guidance = JSON.parse(readFileSync(
  join(root, "../tokens/dist/guidance.json"), "utf8"));

mkdirSync(join(root, "docs"), { recursive: true });
for (const c of components) {
  const props = c.props.map((p: any) =>
    `| \`${p.name}\` | \`${p.type}\` | ${p.default ?? "—"} | ${p.required ? "yes" : "no"} | ${p.description} |`).join("\n");
  const md = `<!-- Generated by emit-docs.ts — do not edit. -->
# ${c.name}

${c.description}

## Props

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|
${props}

## Theming

Override \`--ds-${c.name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}-*\` custom properties at any scope; interactive states derive automatically (${guidance.states.hover} hover, ${guidance.states.active} active).

## Variant guidance

${guidance.variants.map((v: any) => `- **${v.variant}** — ${v.intent}. ${v.typicalUse}.`).join("\n")}

## Rules

${guidance.rules.map((r: string) => `- ${r}`).join("\n")}
`;
  writeFileSync(join(root, "docs", `${c.name}.md`), md);
}
console.log(`[react] wrote docs/*.md (${components.length})`);
```

- [ ] **Step 2:** Append `&& tsx scripts/emit-docs.ts` to the react build script (after manifest). Add `docs/` to react `.gitignore`? NO — commit generated docs so agents browsing the repo (not just node_modules) see them; they regenerate on build.
- [ ] **Step 3:** Build, read `docs/Button.md`, sanity-check tables render. Commit — `feat(react): generated per-component markdown docs`

### Task 23: READMEs + llms.txt (D23)

**Files:** Create `README.md` (root), `packages/tokens/README.md`, `packages/react/README.md`, `llms.txt` (root), `packages/tokens/llms.txt`, `packages/react/llms.txt`

- [ ] **Step 1: Write `packages/tokens/llms.txt`:**

```
# @dku/tokens

OKLCH formula-based design tokens. Code is the source of truth; all artifacts generated.

## Machine-readable artifacts
- dist/resolved/{light,dark,acme}.json: every token with OKLCH, hex, and derivation formula
- dist/guidance.json: variant intent, usage rules, state derivation, typography defaults
- dist/dtcg/{theme}.json: W3C DTCG format export
- dist/components/{name}.vars.css: component-token declarations (--ds-{component}-*)

## Rules for generated code
- Use semantic tokens (--ds-bg-*, --ds-fg-*, --ds-fill-*, --ds-border-*) in app CSS.
- Override --ds-{component}-* tokens for one-off component theming; never fork semantic tokens.
- Scales are pixel-true: --ds-space-8 is 8px (0.5rem). Typography: --ds-text-{size}-{lh}-{weight}.
- Themes: import base.css + {theme}.css + components.css; set data-ds-theme="{name}".
```

`packages/react/llms.txt`:

```
# @dku/react

8 React 19 components consuming @dku/tokens. Zero runtime deps, CSS Modules, ref-as-prop.

## Machine-readable artifacts
- dist/manifest.json: full component/prop inventory with types and defaults
- docs/{Component}.md: per-component docs (props, theming, variant guidance)

## Rules for generated code
- import { Button } from "@dku/react"; import "@dku/react/styles";
- Also import from @dku/tokens: base.css, a theme css, components.css.
- size is a px number (24|32|40|48), never "sm"/"md"/"lg".
- variant vocabulary: accent | accent-subtle | neutral | neutral-subtle | ghost | danger | danger-subtle.
- One accent per visual group. danger only for destructive actions.
```

Root `llms.txt`: 5 lines pointing at the two package llms.txt files, the spec, and this plan.

- [ ] **Step 2: READMEs** — root: what the system is (4 principles, quoted from spec), workspace layout, `pnpm install / build / test / dev` quickstart, links to spec + plans. Package READMEs: install + minimal usage snippet (tokens: CSS imports + data-ds-theme; react: Button example), link to llms.txt artifacts, "generated docs — do not hand-edit" note. Keep each under 60 lines.
- [ ] **Step 3:** Confirm `files` arrays in both package.jsons include `README.md`, `llms.txt`, and (react) `docs`. Commit — `docs: READMEs and llms.txt for humans and agents (D23)`

### Task 24: Theme-aware token docs + final verification

**Files:** Modify `apps/storybook/src/token-docs/token-reader.ts` and the three token-docs stories; Create `.changeset/*.md`

- [ ] **Step 1:** `token-reader.ts`: import all three resolved JSONs, export `getTokens(theme: "light" | "dark" | "acme"): DocToken[]`. Stories: read the active theme from Storybook globals in `render(_, { globals })` and call `getTokens(globals.theme ?? "light")` so swatch/hex tables follow the toolbar theme (R12).
- [ ] **Step 2:** Full pipeline verification:

```bash
pnpm --filter @dku/tokens build && pnpm --filter @dku/react build && pnpm test && pnpm lint
```

Expected: all green; `dist` trees contain components/, dtcg/, guidance.json, manifest.json, styles.css, types/index.d.ts.

- [ ] **Step 3:** `pnpm changeset` — one minor changeset covering `@dku/tokens` and `@dku/react` (breaking-ish typography rename is pre-1.0; note it in the changeset body as a migration line: `--ds-text-{xs|sm|base|lg|...}-*` → `--ds-text-{size}-{lh}-{weight}`).
- [ ] **Step 4: Commit** — `docs(storybook): theme-aware token tables; changeset for v0.1.0`

---

## Self-review notes

- Spec coverage: D19→Task 3, D20–22→Task 1, D23→Tasks 19/21/22/23, D24→Task 20, D25→explicitly out of scope (v2), D26→Task 18. Review R1–R13 all mapped in the milestone table; R14 (spec drift) fixed by the 2026-07-06 spec edits; R15 (hover-chain inconsistency) resolved by Task 4's unified derivation; R16 (Select `size` doc note) covered by generated docs (the prop description in `Select.tsx` must mention "replaces the native rows attribute" — add while doing Task 21 Step 4).
- Type consistency: `componentLabelPairs` (T1) used in build (T1 S4); `compositeHex` (T2) exported for tests; `comboName`/`WEIGHT_VALUES` (T9) consumed in T10/T15/T20; `buttonVars` map (T4) consumed by emitter + tests; `customerThemes` registry (T17) consumed by build.
- Ordering constraints: T10 depends on T9; T15/T20 depend on T9 (typography exports); T22 depends on T19+T21; T5 depends on T4; T7/T8 depend on T6 (ignoreFiles flow). Everything else is independent within its milestone.
