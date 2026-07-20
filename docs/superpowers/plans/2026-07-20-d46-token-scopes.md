# D46 Token Scopes Implementation Plan (HAN-14)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tokens declare `scopes` (allowed CSS property groups); the token build throws when a component token binds a semantic token outside its scope; scopes are emitted into resolved JSON, DTCG `$extensions.psi`, and a generated scope map consumed by a new stylelint rule.

**Architecture:** A new `src/scopes.ts` module owns the property-group vocabulary and the normative `-bg`/`-fg`/`-border` suffix map. `TokenDef` gains an optional `scopes` array authored inline in `light.ts`/`dark.ts` (customer themes inherit via a scope-preserving merge). A pure `src/scope-gate.ts` checks every component-token binding (following `var(--psi-<component>-*)` chains and `oklch(from var(...))` derivations back to semantic tokens) and `build.ts` throws on violations — same posture as the WCAG contrast gate. The build emits `dist/scope-map.json`; a second stylelint rule reads it for consumer CSS.

**Tech Stack:** TypeScript (tsx build scripts), vitest, stylelint custom plugin (ESM).

**Branch:** `dkurkin/han-14-d46-token-scopes-token-build-gate-stylelint-consumer-rule` (Linear HAN-14).

## Global Constraints

- Sizes are px numbers; scale names are pixel-true (`psi-space-8` = 8px).
- Never hardcode colors in component CSS — bind `var(--psi-*)` only.
- New values go in `packages/tokens/src`, never in dist (dist is generated).
- `pnpm build` is the conformance gate — it must throw on violations (same posture as the WCAG contrast gate in `packages/tokens/scripts/build.ts:101-109`).
- Spec (verbatim, D46): "a component token may only reference semantic tokens whose scopes match the property group its own name declares"; "the check follows references through `oklch(from var(--psi-...) ...)` derivations"; "Unscoped tokens stay valid everywhere".
- Spec (D48, applies to token-side too): "a `scopes` entry that is not a known CSS property or declared group" is an error.
- **Zero visual diff**: this task must not change any rendered pixel. The VR suite (absolute `maxDiffPixels` gate per HAN-20) is the proof.
- Verify with `pnpm build`, `pnpm test`, `pnpm lint` before every commit.

## Pre-existing cross-family bindings (drive the scope authoring — do not "fix" them away silently)

| Binding | File | Resolution in this plan |
|---|---|---|
| `tooltip bg: var(--psi-fg-primary)`, `fg: var(--psi-bg-primary)` (deliberate inversion) | `packages/tokens/src/components/tooltip.ts:3-4` | New pure-ref tokens `bgInverted`/`fgOnInverted`; rebind tooltip (Task 3) |
| `border-error: var(--psi-fg-danger)` (Input + Select) | `packages/tokens/src/components/input.ts:8`, `select.ts:8` | `fgDanger` scoped `["text","border"]` |
| `box-border-checked: var(--psi-fill-accent)` (Checkbox) | `packages/tokens/src/components/checkbox.ts:7` | `fillAccent` scoped `["surface","border"]` |
| `navbar bg: var(--psi-scrim-heavy)` | `packages/tokens/src/components/navbar.ts:5` | scrims scoped `["surface"]` — passes |
| `thumb-bg: var(--psi-fg-static-white)` (Switch — found by the gate itself, Task 5) | `packages/tokens/src/components/switch.ts:6` | New pure-ref token `fillStaticWhite` scoped `["surface"]`; switch rebinds (see Addendum) |

---

### Task 1: Scope vocabulary module (`scopes.ts`)

**Files:**
- Create: `packages/tokens/src/scopes.ts`
- Test: `packages/tokens/__tests__/scopes.test.ts`

**Interfaces:**
- Produces: `PROPERTY_GROUPS: Record<string, readonly string[]>`, `SUFFIX_GROUPS: Record<string, string>`, `SCALE_SCOPES: Record<string, readonly string[]>`, `expandScopes(scopes: readonly string[]): readonly string[]`, `isKnownScopeEntry(entry: string): boolean`, `keyGroup(key: string): string | undefined`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/tokens/__tests__/scopes.test.ts
import { describe, expect, it } from "vitest";
import {
  PROPERTY_GROUPS, SUFFIX_GROUPS, SCALE_SCOPES,
  expandScopes, isKnownScopeEntry, keyGroup,
} from "../src/scopes.js";

describe("scopes vocabulary", () => {
  it("declares the three normative suffix groups", () => {
    expect(SUFFIX_GROUPS).toEqual({ fg: "text", bg: "surface", border: "border" });
  });

  it("every suffix group is a declared property group", () => {
    for (const g of Object.values(SUFFIX_GROUPS)) {
      expect(PROPERTY_GROUPS[g]).toBeDefined();
    }
  });

  it("expands group names to concrete properties", () => {
    expect(expandScopes(["text"])).toEqual(expect.arrayContaining(["color", "fill", "stroke"]));
  });

  it("passes concrete property names through and dedupes", () => {
    const out = expandScopes(["color", "text"]);
    expect(out.filter((p) => p === "color")).toHaveLength(1);
  });

  it("throws on unknown entries in expandScopes", () => {
    expect(() => expandScopes(["texture"])).toThrow(/unknown scope entry/i);
  });

  it("isKnownScopeEntry accepts groups and known properties, rejects junk", () => {
    expect(isKnownScopeEntry("text")).toBe(true);
    expect(isKnownScopeEntry("background-color")).toBe(true);
    expect(isKnownScopeEntry("texture")).toBe(false);
  });

  it("keyGroup reads the last bg/fg/border segment", () => {
    expect(keyGroup("accent-bg")).toBe("surface");
    expect(keyGroup("accent-bg-hover")).toBe("surface");
    expect(keyGroup("bg")).toBe("surface");
    expect(keyGroup("fg")).toBe("text");
    expect(keyGroup("border-error")).toBe("border");
    expect(keyGroup("box-border-checked")).toBe("border");
    expect(keyGroup("outline-fg-hover")).toBe("text");
    expect(keyGroup("focus-ring")).toBeUndefined();
    expect(keyGroup("radius")).toBeUndefined();
    expect(keyGroup("backdrop")).toBeUndefined();
  });

  it("space scale is scoped to the gap group", () => {
    expect(SCALE_SCOPES.space).toEqual(["gap"]);
    expect(PROPERTY_GROUPS.gap).toContain("gap");
    expect(PROPERTY_GROUPS.gap).toContain("padding");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/tokens/__tests__/scopes.test.ts`
Expected: FAIL — `Cannot find module '../src/scopes.js'`

- [ ] **Step 3: Write the implementation**

```ts
// packages/tokens/src/scopes.ts
/** D46 — token scope vocabulary. Scope entries on a token are either a
 * property-group name (key of PROPERTY_GROUPS) or a concrete CSS property
 * listed in one of the groups. The -bg/-fg/-border suffix convention on
 * component-token keys is normative: SUFFIX_GROUPS is the shipped map. */

export const PROPERTY_GROUPS: Record<string, readonly string[]> = {
  text: ["color", "fill", "stroke", "caret-color", "text-decoration-color"],
  surface: ["background", "background-color"],
  border: [
    "border", "border-color", "border-top-color", "border-right-color",
    "border-bottom-color", "border-left-color", "outline", "outline-color",
    "box-shadow",
  ],
  gap: [
    "gap", "row-gap", "column-gap",
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "padding-inline", "padding-block",
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
    "margin-inline", "margin-block",
    "inset", "top", "right", "bottom", "left",
    "scroll-margin", "scroll-padding", "translate",
  ],
};

/** Normative component-token suffix → property group (D46). */
export const SUFFIX_GROUPS: Record<string, string> = {
  fg: "text",
  bg: "surface",
  border: "border",
};

/** Scale-family scopes (D46 "gaps" family). Families not listed are unscoped. */
export const SCALE_SCOPES: Record<string, readonly string[]> = {
  space: ["gap"],
};

const KNOWN_PROPERTIES = new Set(Object.values(PROPERTY_GROUPS).flat());

export function isKnownScopeEntry(entry: string): boolean {
  return entry in PROPERTY_GROUPS || KNOWN_PROPERTIES.has(entry);
}

/** Expand scope entries (group names or property names) to a deduped
 * property list. Throws on unknown entries (D48 posture). */
export function expandScopes(scopes: readonly string[]): readonly string[] {
  const out = new Set<string>();
  for (const entry of scopes) {
    if (entry in PROPERTY_GROUPS) {
      for (const p of PROPERTY_GROUPS[entry]) out.add(p);
    } else if (KNOWN_PROPERTIES.has(entry)) {
      out.add(entry);
    } else {
      throw new Error(`unknown scope entry "${entry}" — not a known CSS property or declared group`);
    }
  }
  return [...out];
}

/** Property group a component-token key declares via its last bg/fg/border
 * segment ("accent-bg-hover" → surface). Undefined for unsuffixed keys
 * ("focus-ring", "radius", "backdrop") — those are not scope-checked. */
export function keyGroup(key: string): string | undefined {
  const segments = key.split("-");
  for (let i = segments.length - 1; i >= 0; i--) {
    const group = SUFFIX_GROUPS[segments[i]];
    if (group) return group;
  }
  return undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/tokens/__tests__/scopes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/src/scopes.ts packages/tokens/__tests__/scopes.test.ts
git commit -m "feat(tokens): D46 scope vocabulary — property groups, normative suffix map"
```

---

### Task 2: `scopes` on TokenDef → ResolvedToken; validator checks

**Files:**
- Modify: `packages/tokens/src/dsl/types.ts:36-42` (TokenDef), `:71-81` (ResolvedToken)
- Modify: `packages/tokens/src/dsl/resolver.ts:133-143`
- Modify: `packages/tokens/src/dsl/validator.ts` (unknown-entry check in `validate()`, new `validateScopeConsistency`)
- Test: `packages/tokens/__tests__/validator.test.ts` (extend), `packages/tokens/__tests__/resolver.test.ts` (extend)

**Interfaces:**
- Consumes: `isKnownScopeEntry` from Task 1.
- Produces: `TokenDef.scopes?: readonly string[]`; `ResolvedToken.scopes?: readonly string[]`; `validateScopeConsistency(themes: Record<string, ThemeDef>): void` (throws `ValidationError` when the same token name carries different scopes in different themes).

- [ ] **Step 1: Write the failing tests**

Append to `packages/tokens/__tests__/validator.test.ts` (reuse the file's existing `slots` fixture):

```ts
import { validateScopeConsistency } from "../src/dsl/validator.js";

describe("scope validation (D46)", () => {
  it("accepts tokens with known scope entries", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.ink, scopes: ["text"] }),
      fgDanger: token({ from: slot.danger, scopes: ["text", "border"] }),
    };
    expect(() => validate(theme, slots)).not.toThrow();
  });

  it("rejects unknown scope entries", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.ink, scopes: ["texture"] }),
    };
    expect(() => validate(theme, slots)).toThrow(ValidationError);
  });

  it("rejects scope drift between themes for the same token name", () => {
    const a: ThemeDef = { fgPrimary: token({ from: slot.ink, scopes: ["text"] }) };
    const b: ThemeDef = { fgPrimary: token({ from: slot.ink, scopes: ["surface"] }) };
    expect(() => validateScopeConsistency({ light: a, dark: b })).toThrow(ValidationError);
  });

  it("accepts identical or absent scopes across themes", () => {
    const a: ThemeDef = { fgPrimary: token({ from: slot.ink, scopes: ["text"] }), x: token({ from: slot.ink }) };
    const b: ThemeDef = { fgPrimary: token({ from: slot.ink, scopes: ["text"] }), x: token({ from: slot.ink }) };
    expect(() => validateScopeConsistency({ light: a, dark: b })).not.toThrow();
  });
});
```

Append to `packages/tokens/__tests__/resolver.test.ts` (reuse its existing palette/slots fixtures — read the file first and match its fixture names):

```ts
it("carries scopes into ResolvedToken and does not inherit them through refs", () => {
  const theme: ThemeDef = {
    fgStaticBlack: token({ from: slot.ink, scopes: ["text"] }),
    fgOnAccent: token({ from: ref.fgStaticBlack, l: set(0.14) }),
  };
  const resolved = resolve(theme, palette, slots);
  expect(resolved.fgStaticBlack.scopes).toEqual(["text"]);
  expect(resolved.fgOnAccent.scopes).toBeUndefined();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run packages/tokens/__tests__/validator.test.ts packages/tokens/__tests__/resolver.test.ts`
Expected: FAIL — TS error on `scopes` property / `validateScopeConsistency` not exported.

- [ ] **Step 3: Implement**

`types.ts` — add to `TokenDef` (after `alpha`):

```ts
  /** D46: property groups / CSS properties this token may bind to
   * (see src/scopes.ts). Unscoped tokens are valid everywhere. */
  readonly scopes?: readonly string[];
```

Add the identical field to `ResolvedToken` (after `formula`).

`resolver.ts` — in the `resolved: ResolvedToken` literal (line ~133), after `formula`:

```ts
      ...(def.scopes !== undefined ? { scopes: def.scopes } : {}),
```

(scopes come only from the token's own def — a ref does not inherit its source's scopes; fgOnAccent's binding legality is its own declaration.)

`validator.ts` — import `isKnownScopeEntry` from `../scopes.js`; inside the `for (const [name, token] of Object.entries(theme))` loop in `validate()`:

```ts
    for (const entry of token.scopes ?? []) {
      if (!isKnownScopeEntry(entry)) {
        throw new ValidationError(
          `Unknown scope entry "${entry}" in token "${name}" — not a known CSS property or declared group`,
          [name],
        );
      }
    }
```

New export at the bottom of `validator.ts`:

```ts
/** D46: the same token name must carry identical scopes in every theme —
 * scopes are a property of the token's meaning, not of a theme. */
export function validateScopeConsistency(themes: Record<string, ThemeDef>): void {
  const seen = new Map<string, { theme: string; scopes: string }>();
  for (const [themeName, theme] of Object.entries(themes)) {
    for (const [name, def] of Object.entries(theme)) {
      const key = JSON.stringify(def.scopes ?? null);
      const prior = seen.get(name);
      if (prior === undefined) {
        seen.set(name, { theme: themeName, scopes: key });
      } else if (prior.scopes !== key) {
        throw new ValidationError(
          `Scope drift for token "${name}": ${prior.theme} declares ${prior.scopes}, ${themeName} declares ${key}`,
          [name],
        );
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/tokens/__tests__/validator.test.ts packages/tokens/__tests__/resolver.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/src/dsl/types.ts packages/tokens/src/dsl/resolver.ts packages/tokens/src/dsl/validator.ts packages/tokens/__tests__/validator.test.ts packages/tokens/__tests__/resolver.test.ts
git commit -m "feat(tokens): scopes field on TokenDef/ResolvedToken + validator checks"
```

---

### Task 3: Inversion tokens + tooltip rebind (zero visual diff)

**Files:**
- Modify: `packages/tokens/src/themes/light.ts`, `packages/tokens/src/themes/dark.ts`
- Modify: `packages/tokens/src/components/tooltip.ts:3-4`
- Check/modify: `packages/tokens/src/contrast-matrix.ts` (componentLabelPairs — see Step 3)
- Test: `packages/tokens/__tests__/inverted-tokens.test.ts` (new)

**Interfaces:**
- Produces: semantic tokens `bgInverted` (≡ `ref.fgPrimary`, scopes `["surface"]` — added in Task 4) and `fgOnInverted` (≡ `ref.bgPrimary`, scopes `["text"]`) in every theme; tooltip binds `bg: var(--psi-bg-inverted)`, `fg: var(--psi-fg-on-inverted)`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/tokens/__tests__/inverted-tokens.test.ts
import { describe, expect, it } from "vitest";
import { resolve } from "../src/dsl/resolver.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { tooltipVars } from "../src/components/tooltip.js";

const themes = [
  { name: "light", theme: lightTheme, palette: defaultPalette, slots: defaultSlots },
  { name: "dark", theme: darkTheme, palette: defaultPalette, slots: defaultSlots },
  ...Object.entries(customerThemes).map(([name, c]) => ({
    name, theme: assembleCustomerTheme(c), palette: c.palette, slots: c.slots,
  })),
];

describe("inversion tokens (D46 tooltip rebind)", () => {
  // Pure refs → byte-identical hex with their source in EVERY theme.
  // This is the zero-visual-diff guarantee for the tooltip rebind.
  it.each(themes)("bgInverted ≡ fgPrimary and fgOnInverted ≡ bgPrimary in $name", (t) => {
    const r = resolve(t.theme, t.palette, t.slots);
    expect(r.bgInverted.hex).toBe(r.fgPrimary.hex);
    expect(r.fgOnInverted.hex).toBe(r.bgPrimary.hex);
  });

  it("tooltip binds the inversion tokens, not raw fg/bg", () => {
    expect(tooltipVars.bg).toBe("var(--psi-bg-inverted)");
    expect(tooltipVars.fg).toBe("var(--psi-fg-on-inverted)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/tokens/__tests__/inverted-tokens.test.ts`
Expected: FAIL — `bgInverted` undefined.

- [ ] **Step 3: Implement**

In `light.ts` AND `dark.ts`, after the `bgPrimary`/`bgSecondary` block (identical text in both files — pure refs track each theme's own values, so customer themes that override `fgPrimary`/`bgPrimary` — ember does — stay correct with no per-brand override):

```ts
  /** D46: the deliberate inversion pair (tooltip). Pure refs — always
   * byte-identical with fgPrimary/bgPrimary in every theme — but scoped
   * for what they ARE: an inverted surface and the label on it. */
  bgInverted: token({ from: ref.fgPrimary }),
  fgOnInverted: token({ from: ref.bgPrimary }),
```

In `tooltip.ts` replace lines 3-4:

```ts
  bg: "var(--psi-bg-inverted)",
  fg: "var(--psi-fg-on-inverted)",
```

Then check the contrast matrix: `grep -n "tooltip\|fgPrimaryInverted\|bgPrimary" packages/tokens/src/contrast-matrix.ts`. If `componentLabelPairs` carries a tooltip pair naming `bgPrimary`-on-`fgPrimary` (or equivalent), update it to `fgOnInverted`-on-`bgInverted` so the pair names what tooltip actually binds. If no tooltip pair exists, add one:

```ts
  { fg: "fgOnInverted", bg: "bgInverted", minRatio: 4.5, context: "Tooltip label (D46 inversion pair)" },
```

(match the file's actual pair shape — read it first; WCAG ratio is symmetric so this passes exactly when fgPrimary-on-bgPrimary passes).

- [ ] **Step 4: Run tests + full build**

Run: `pnpm vitest run packages/tokens/__tests__/inverted-tokens.test.ts && pnpm --filter @handamade/psi-tokens build`
Expected: test PASS; build green (contrast gate passes — new pair is the mirrored AA pair).

- [ ] **Step 5: Verify zero CSS-value drift**

Run: `git diff --stat packages/tokens/dist 2>/dev/null || true` — dist is gitignored, so instead: `node -e "const t=require('./packages/tokens/dist/resolved/ember.json').tokens; console.log(t.bgInverted.hex, t.fgPrimary.hex, t.fgOnInverted.hex, t.bgPrimary.hex)"`
Expected: first two hexes equal; last two hexes equal. Repeat mentally for light (or run with light.json).

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/src/themes/light.ts packages/tokens/src/themes/dark.ts packages/tokens/src/components/tooltip.ts packages/tokens/src/contrast-matrix.ts packages/tokens/__tests__/inverted-tokens.test.ts
git commit -m "feat(tokens): bgInverted/fgOnInverted inversion pair; tooltip rebinds (zero visual diff)"
```

---

### Task 4: Author scopes on light/dark; scope-preserving customer merge

**Files:**
- Modify: `packages/tokens/src/themes/light.ts`, `packages/tokens/src/themes/dark.ts` (add `scopes:` to every color token)
- Modify: `packages/tokens/src/themes/customers/index.ts:27-30` (`assembleCustomerTheme`)
- Test: `packages/tokens/__tests__/theme-scopes.test.ts` (new)

**Interfaces:**
- Consumes: `validateScopeConsistency` (Task 2).
- Produces: every semantic color token in both base themes carries `scopes`; `assembleCustomerTheme` preserves base scopes on overridden tokens unless the override declares its own.

**The authoritative scope table** (apply IDENTICALLY in light.ts and dark.ts — Task 2's consistency validator enforces it):

| Tokens | scopes |
|---|---|
| `fgPrimary fgSecondary fgTertiary fgQuaternary fgPrimaryInverted fgStaticWhite fgStaticBlack fgOnAccent fgAccent fgSuccess fgWarning fgOnInverted` | `["text"]` |
| `fgDanger` | `["text", "border"]` (error borders: input.ts:8, select.ts:8) |
| `bgPrimary bgSecondary bgInverted fillStaticWhite fillNeutral1..6 fillSuccess fillWarning fillDanger fillTintAccent fillTintSuccess fillTintWarning fillTintDanger scrimSoft scrimMedium scrimHeavy` | `["surface"]` |
| `fillAccent` | `["surface", "border"]` (selected-control borders: checkbox.ts:7) |
| `borderFaint borderNeutral borderStrong borderFocus` | `["border"]` |

Example of the edit shape (light.ts):

```ts
  fgPrimary: token({ from: slot.ink, l: set(0.3), c: set(0.03), scopes: ["text"] }),
  fgDanger: token({ from: slot.danger, l: set(0.48), c: cap(0.1946), scopes: ["text", "border"] }),
  fillAccent: token({ from: slot.accent, scopes: ["surface", "border"] }),
  borderFocus: token({ from: ref.fgAccent, scopes: ["border"] }),
```

- [ ] **Step 1: Write the failing test**

```ts
// packages/tokens/__tests__/theme-scopes.test.ts
import { describe, expect, it } from "vitest";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import { validateScopeConsistency } from "../src/dsl/validator.js";

describe("authored scopes (D46)", () => {
  it("every color token in light and dark is scoped", () => {
    for (const [name, theme] of Object.entries({ light: lightTheme, dark: darkTheme })) {
      for (const [tokenName, def] of Object.entries(theme)) {
        expect(def.scopes, `${name}.${tokenName} must declare scopes`).toBeDefined();
      }
    }
  });

  it("light and dark declare identical scopes per token", () => {
    expect(() => validateScopeConsistency({ light: lightTheme, dark: darkTheme })).not.toThrow();
  });

  it("cross-family design decisions are declared, not smuggled", () => {
    expect(lightTheme.fgDanger.scopes).toEqual(["text", "border"]);
    expect(lightTheme.fillAccent.scopes).toEqual(["surface", "border"]);
    expect(lightTheme.fgPrimary.scopes).toEqual(["text"]);
    expect(lightTheme.bgInverted.scopes).toEqual(["surface"]);
    expect(lightTheme.fgOnInverted.scopes).toEqual(["text"]);
  });

  it("customer overrides inherit base scopes (ember fgOnAccent, acme fgDanger)", () => {
    const ember = assembleCustomerTheme(customerThemes.ember);
    expect(ember.fgOnAccent.scopes).toEqual(["text"]);
    const acme = assembleCustomerTheme(customerThemes.acme);
    expect(acme.fgDanger.scopes).toEqual(["text", "border"]);
  });

  it("assembled customer themes stay scope-consistent with base themes", () => {
    expect(() => validateScopeConsistency({
      light: lightTheme,
      dark: darkTheme,
      ...Object.fromEntries(Object.entries(customerThemes).map(([n, c]) => [n, assembleCustomerTheme(c)])),
    })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/tokens/__tests__/theme-scopes.test.ts`
Expected: FAIL — scopes undefined.

- [ ] **Step 3: Implement**

Apply the scope table to every token in `light.ts` and `dark.ts` (30 tokens each — mechanical, follow the table exactly; do NOT touch formulas).

`customers/index.ts` — replace `assembleCustomerTheme`:

```ts
/** Assemble the full semantic ThemeDef for a customer brand (D27).
 * D46: an override inherits the base token's scopes unless it declares its
 * own — a brand retuning fgOnAccent's formula must not silently unscope it. */
export function assembleCustomerTheme(c: CustomerTheme): ThemeDef {
  const base = c.base === "dark" ? darkTheme : lightTheme;
  const merged: Record<string, TokenDef> = { ...base };
  for (const [name, def] of Object.entries(c.overrides ?? {})) {
    const baseScopes = base[name]?.scopes;
    merged[name] = def.scopes === undefined && baseScopes !== undefined
      ? { ...def, scopes: baseScopes }
      : def;
  }
  return merged;
}
```

(add `TokenDef` to the type import from `../../dsl/types.js`.)

- [ ] **Step 4: Run the full token test suite + build**

Run: `pnpm vitest run packages/tokens && pnpm --filter @handamade/psi-tokens build`
Expected: all PASS, build green. (`emitTokenTypes` and CSS emitters ignore unknown TokenDef fields — if the build errors on `scopes`, fix the emitter to ignore it, not the theme files.)

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/src/themes/ packages/tokens/__tests__/theme-scopes.test.ts
git commit -m "feat(tokens): author D46 scopes on all semantic color tokens; scope-preserving brand merge"
```

---

### Task 5: The scope gate (`scope-gate.ts`)

**Files:**
- Create: `packages/tokens/src/scope-gate.ts`
- Test: `packages/tokens/__tests__/scope-gate.test.ts`

**Interfaces:**
- Consumes: `keyGroup`, `expandScopes`, `PROPERTY_GROUPS`, `SUFFIX_GROUPS` (Task 1); `ThemeDef` types.
- Produces:

```ts
export interface ScopeViolation {
  component: string;   // "button"
  key: string;         // "accent-bg"
  group: string;       // "surface"
  token: string;       // "fgPrimary" (the out-of-scope semantic token)
  scopes: readonly string[];
}
export function checkScopes(
  componentVars: Record<string, Record<string, string>>,
  theme: ThemeDef,
): ScopeViolation[];
export function checkOverrideScopes(
  overrides: Record<string, string>,          // ember-style: "card-radius": "0"
  componentVars: Record<string, Record<string, string>>,
  theme: ThemeDef,
): ScopeViolation[];
```

**Algorithm** (for `checkScopes`; each component, each key):
1. `group = keyGroup(key)`; if undefined → skip (unsuffixed keys are unchecked).
2. Collect semantic references from the value: every `var(--psi-<name>)` match where `<name>` is not `<component>-*` (own token) and not a scale token (`/^(space|size|radius|text|font|duration|ease|z)-/`). Own-token references (`--psi-button-accent-bg`) are resolved recursively through `componentVars[component]` (cycle-guard with a `Set`); `oklch(from var(--psi-...) ...)` needs no special casing — the same `var(--psi-...)` regex sees through it.
3. Kebab→token name via a `Map` built from `Object.keys(theme)` using `camelToKebab` — import it from `../scripts/emit-css.js`... **no**: `emit-css.ts` lives in `scripts/`, outside `src/`. Re-implement locally (it is 1 line) to keep `src` self-contained:
   `const camelToKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();`
4. Unknown name (neither semantic nor own nor scale) → treat as a violation with `scopes: []` and token = the raw var name (catches typos — a binding to a nonexistent token is never right).
5. For each semantic token found: if it has no `scopes` → pass (spec: unscoped valid everywhere). Else `expandScopes(token.scopes)` must intersect `PROPERTY_GROUPS[group]` — i.e. the token's allowed properties must cover the key's group. Implementation: token passes iff its scope entries include the group name itself or any property in `PROPERTY_GROUPS[group]`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/tokens/__tests__/scope-gate.test.ts
import { describe, expect, it } from "vitest";
import { checkScopes, checkOverrideScopes } from "../src/scope-gate.js";
import { token, set, slot, ref } from "../src/dsl/builders.js";
import type { ThemeDef } from "../src/dsl/types.js";
// The real inventory — the positive gate: current bindings must be clean.
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import { buttonVars } from "../src/components/button.js";
import { cardVars } from "../src/components/card.js";
import { checkboxVars } from "../src/components/checkbox.js";
import { dialogVars } from "../src/components/dialog.js";
import { fieldVars } from "../src/components/field.js";
import { inputVars } from "../src/components/input.js";
import { mediaVars } from "../src/components/media.js";
import { navbarVars } from "../src/components/navbar.js";
import { selectVars } from "../src/components/select.js";
import { switchVars } from "../src/components/switch.js";
import { tagVars } from "../src/components/tag.js";
import { tooltipVars } from "../src/components/tooltip.js";

const allVars = {
  button: buttonVars, card: cardVars, checkbox: checkboxVars, dialog: dialogVars,
  field: fieldVars, input: inputVars, media: mediaVars, navbar: navbarVars,
  select: selectVars, switch: switchVars, tag: tagVars, tooltip: tooltipVars,
};

const miniTheme: ThemeDef = {
  fgMuted: token({ from: slot.ink, scopes: ["text"] }),
  fillBase: token({ from: slot.canvas, scopes: ["surface"] }),
  borderLine: token({ from: ref.fgMuted, scopes: ["border"] }),
  legacy: token({ from: slot.ink }), // unscoped
};

describe("scope gate (D46)", () => {
  // ── the spec's own motivating example ──
  it("flags a text token bound to a -bg key", () => {
    const v = checkScopes({ widget: { "accent-bg": "var(--psi-fg-muted)" } }, miniTheme);
    expect(v).toEqual([{ component: "widget", key: "accent-bg", group: "surface", token: "fgMuted", scopes: ["text"] }]);
  });

  it("flags a surface token bound to a -fg key", () => {
    const v = checkScopes({ widget: { "label-fg": "var(--psi-fill-base)" } }, miniTheme);
    expect(v).toHaveLength(1);
    expect(v[0].token).toBe("fillBase");
  });

  it("passes matching bindings and unscoped tokens", () => {
    expect(checkScopes({ widget: {
      "label-fg": "var(--psi-fg-muted)",
      "panel-bg": "var(--psi-fill-base)",
      "rim-border": "var(--psi-border-line)",
      "anything-bg": "var(--psi-legacy)",
    } }, miniTheme)).toEqual([]);
  });

  it("sees through oklch(from var()) derivations", () => {
    const v = checkScopes({ widget: {
      "hover-bg": "oklch(from var(--psi-fg-muted) calc(l - 0.04) c h)",
    } }, miniTheme);
    expect(v).toHaveLength(1);
  });

  it("follows own-token chains to the semantic binding", () => {
    const v = checkScopes({ widget: {
      "accent-bg": "var(--psi-fg-muted)",
      "accent-bg-hover": "oklch(from var(--psi-widget-accent-bg) calc(l - 0.04) c h)",
    } }, miniTheme);
    // both the direct binding and the derived one land on fgMuted-as-surface
    expect(v).toHaveLength(2);
  });

  it("skips unsuffixed keys and scale tokens", () => {
    expect(checkScopes({ widget: {
      "focus-ring": "var(--psi-fg-muted)",
      "pad": "var(--psi-space-8)",
      "label-fg": "var(--psi-text-15-24-regular)",
    } }, miniTheme)).toEqual([]);
  });

  it("flags a binding to a nonexistent token as a violation", () => {
    const v = checkScopes({ widget: { "label-fg": "var(--psi-fg-mutted)" } }, miniTheme);
    expect(v).toHaveLength(1);
    expect(v[0].scopes).toEqual([]);
  });

  // ── the real inventory is clean, in every theme ──
  const themes = {
    light: lightTheme, dark: darkTheme,
    ...Object.fromEntries(Object.entries(customerThemes).map(([n, c]) => [n, assembleCustomerTheme(c)])),
  };
  it.each(Object.entries(themes))("real component bindings pass in %s", (_name, theme) => {
    expect(checkScopes(allVars, theme)).toEqual([]);
  });

  it("real customer componentOverrides pass", () => {
    for (const [name, c] of Object.entries(customerThemes)) {
      expect(checkOverrideScopes(c.componentOverrides ?? {}, allVars, themes[name as keyof typeof themes])).toEqual([]);
    }
  });

  it("flags an out-of-scope componentOverride", () => {
    const v = checkOverrideScopes({ "widget-accent-bg": "var(--psi-fg-muted)" }, { widget: {} }, miniTheme);
    expect(v).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/tokens/__tests__/scope-gate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/tokens/src/scope-gate.ts`**

```ts
import type { ThemeDef } from "./dsl/types.js";
import { PROPERTY_GROUPS, expandScopes, keyGroup } from "./scopes.js";

export interface ScopeViolation {
  component: string;
  key: string;
  group: string;
  token: string;
  scopes: readonly string[];
}

const VAR_RE = /var\((--psi-[a-z0-9-]+)/g;
const SCALE_RE = /^--psi-(space|size|radius|text|font|duration|ease|z)-/;
const camelToKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Collect the semantic token names (camelCase) a component-token value
 * ultimately binds, following own-token chains. Unresolvable --psi- refs
 * are returned as raw var names (prefixed "!") for the caller to flag. */
function semanticRefs(
  component: string,
  value: string,
  vars: Record<string, string>,
  kebabToName: Map<string, string>,
  seen: Set<string> = new Set(),
): string[] {
  const out: string[] = [];
  for (const m of value.matchAll(VAR_RE)) {
    const varName = m[1];
    const bare = varName.slice("--psi-".length);
    if (SCALE_RE.test(varName)) continue;
    const ownPrefix = `${component}-`;
    if (bare.startsWith(ownPrefix)) {
      const ownKey = bare.slice(ownPrefix.length);
      if (seen.has(ownKey)) continue;
      seen.add(ownKey);
      const ownValue = vars[ownKey];
      if (ownValue === undefined) { out.push(`!${varName}`); continue; }
      out.push(...semanticRefs(component, ownValue, vars, kebabToName, seen));
      continue;
    }
    const name = kebabToName.get(bare);
    out.push(name ?? `!${varName}`);
  }
  return out;
}

function checkOne(
  component: string,
  key: string,
  value: string,
  vars: Record<string, string>,
  theme: ThemeDef,
  kebabToName: Map<string, string>,
): ScopeViolation[] {
  const group = keyGroup(key);
  if (!group) return [];
  const groupProps = new Set(PROPERTY_GROUPS[group]);
  const violations: ScopeViolation[] = [];
  for (const name of semanticRefs(component, value, vars, kebabToName)) {
    if (name.startsWith("!")) {
      violations.push({ component, key, group, token: name.slice(1), scopes: [] });
      continue;
    }
    const scopes = theme[name]?.scopes;
    if (scopes === undefined) continue; // unscoped tokens are valid everywhere
    const allowed = scopes.includes(group) || expandScopes(scopes).some((p) => groupProps.has(p));
    if (!allowed) violations.push({ component, key, group, token: name, scopes });
  }
  return violations;
}

/** D46 primary gate: every component token whose key declares a property
 * group (-bg/-fg/-border) may only bind semantic tokens scoped to it. */
export function checkScopes(
  componentVars: Record<string, Record<string, string>>,
  theme: ThemeDef,
): ScopeViolation[] {
  const kebabToName = new Map(Object.keys(theme).map((n) => [camelToKebab(n), n]));
  const violations: ScopeViolation[] = [];
  for (const [component, vars] of Object.entries(componentVars)) {
    for (const [key, value] of Object.entries(vars)) {
      violations.push(...checkOne(component, key, value, vars, theme, kebabToName));
    }
  }
  return violations;
}

/** Same gate for brand componentOverrides ("button-accent-bg": "..."):
 * component resolved by longest known prefix; unknown prefixes are skipped
 * (non-color overrides like media-tint carry no component token shape). */
export function checkOverrideScopes(
  overrides: Record<string, string>,
  componentVars: Record<string, Record<string, string>>,
  theme: ThemeDef,
): ScopeViolation[] {
  const kebabToName = new Map(Object.keys(theme).map((n) => [camelToKebab(n), n]));
  const components = Object.keys(componentVars).sort((a, b) => b.length - a.length);
  const violations: ScopeViolation[] = [];
  for (const [fullKey, value] of Object.entries(overrides)) {
    const component = components.find((c) => fullKey.startsWith(`${c}-`));
    if (!component) continue;
    const key = fullKey.slice(component.length + 1);
    violations.push(...checkOne(component, key, value, componentVars[component], theme, kebabToName));
  }
  return violations;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/tokens/__tests__/scope-gate.test.ts`
Expected: PASS. If a "real inventory" case fails, STOP and inspect: either the binding is a genuine latent violation (report it — do not widen scopes to shut the test up) or the scope table missed a deliberate cross-use (Task 4 table + this plan's cross-family table are the authority).

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/src/scope-gate.ts packages/tokens/__tests__/scope-gate.test.ts
git commit -m "feat(tokens): D46 scope gate — component-binding checks with derivation see-through"
```

---

### Task 6: Wire the gate into the build; emit scopes (resolved JSON, DTCG, scope map)

**Files:**
- Modify: `packages/tokens/scripts/build.ts` (gate call in theme loop ~line 110; scope-map emit after component vars ~line 171; `validateScopeConsistency` after the loop)
- Modify: `packages/tokens/scripts/emit-dtcg.ts:18-24`
- Modify: `packages/tokens/scripts/emit-json.ts` (scales scopes only — token scopes flow automatically via `ResolvedToken`)
- Test: `packages/tokens/__tests__/emit-dtcg.test.ts` (extend), `packages/tokens/__tests__/emit-json.test.ts` (new)

**Interfaces:**
- Consumes: `checkScopes`, `checkOverrideScopes` (Task 5), `validateScopeConsistency` (Task 2), `SCALE_SCOPES` (Task 1).
- Produces: `dist/scope-map.json` with shape:

```json
{
  "propertyGroups": { "text": ["color", "..."], "surface": ["..."], "border": ["..."], "gap": ["..."] },
  "semantic": { "fg-primary": ["text"], "fill-accent": ["surface", "border"] },
  "component": { "button-accent-bg": ["surface"], "tooltip-fg": ["text"] },
  "scales": { "space": ["gap"] }
}
```

(`semantic`: kebab token name → scopes, only scoped tokens; `component`: `<component>-<key>` → `[group]` for every suffixed key; theme-independent — Task 2's consistency validator is what makes a single map sound.)

- [ ] **Step 1: Write the failing tests**

New `packages/tokens/__tests__/emit-json.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emitResolvedJSON } from "../scripts/emit-json.js";
import { resolve } from "../src/dsl/resolver.js";
import { lightTheme } from "../src/themes/light.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";

describe("emitResolvedJSON (D46 scopes)", () => {
  const json = JSON.parse(emitResolvedJSON("light", resolve(lightTheme, defaultPalette, defaultSlots)));
  it("tokens carry scopes", () => {
    expect(json.tokens.fgPrimary.scopes).toEqual(["text"]);
    expect(json.tokens.fgDanger.scopes).toEqual(["text", "border"]);
  });
  it("scales carry family scopes", () => {
    expect(json.scales.scopes).toEqual({ space: ["gap"] });
  });
});
```

Extend `packages/tokens/__tests__/emit-dtcg.test.ts` (match its existing fixture setup — read the file first):

```ts
it("scoped tokens carry $extensions.psi.scopes (D46)", () => {
  expect(dtcg.color.fg.primary.$extensions).toEqual({ psi: { scopes: ["text"] } });
  expect(dtcg.color.fill.accent.$extensions).toEqual({ psi: { scopes: ["surface", "border"] } });
});
it("dimension.space carries $extensions.psi.scopes", () => {
  expect(dtcg.dimension.space.$extensions).toEqual({ psi: { scopes: ["gap"] } });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run packages/tokens/__tests__/emit-json.test.ts packages/tokens/__tests__/emit-dtcg.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the emits**

`emit-json.ts` — import `SCALE_SCOPES` from `../src/scopes.js`; in the `scales:` object add `scopes: SCALE_SCOPES,` after `layout:`. (Token scopes need no change — `ResolvedToken` already carries them through `tokens: resolved`.)

`emit-dtcg.ts` — in the per-token loop (line ~18), after `$description`:

```ts
      ...(t.scopes !== undefined ? { $extensions: { psi: { scopes: t.scopes } } } : {}),
```

and on the `space` dimension group (line ~31):

```ts
      space: {
        ...Object.fromEntries(spacingScale.map((px) => [String(px), dim(px)])),
        $extensions: { psi: { scopes: SCALE_SCOPES.space } },
      },
```

(import `SCALE_SCOPES` from `../src/scopes.js`.)

- [ ] **Step 4: Wire the gate + scope map into `build.ts`**

Imports:

```ts
import { checkScopes, checkOverrideScopes } from "../src/scope-gate.js";
import { validateScopeConsistency } from "../src/dsl/validator.js";
import { SCALE_SCOPES, PROPERTY_GROUPS, keyGroup } from "../src/scopes.js";
import { camelToKebab } from "./emit-css.js";
```

Move the `componentVars` registry declaration (currently lines 147-160) ABOVE the theme loop (before `for (const [themeName, config] of ...)`) so the gate can use it.

Inside the theme loop, after the contrast gate block (line ~110):

```ts
    // D46 scope gate — same posture as the contrast gate.
    const scopeViolations = [
      ...checkScopes(componentVars, themeDef),
      ...checkOverrideScopes(config.componentOverrides ?? {}, componentVars, themeDef),
    ];
    if (scopeViolations.length > 0) {
      console.error(`  SCOPE VIOLATIONS in ${themeName}:`);
      for (const v of scopeViolations) {
        console.error(`    --psi-${v.component}-${v.key} (${v.group}) binds ${v.token} [${v.scopes.join(", ") || "unknown token"}]`);
      }
      throw new Error(`${themeName} theme has ${scopeViolations.length} scope violations`);
    }
    console.log(`  scope gate passed for ${themeName}`);
```

Before the loop (right after the `themes` record is built is fine — put it at the top of `build()`):

```ts
  validateScopeConsistency(Object.fromEntries(Object.entries(themes).map(([n, c]) => [n, c.theme])));
```

After the components emit block (line ~171):

```ts
  // D46 scope map for the stylelint consumer rule.
  const semanticScopes = Object.fromEntries(
    Object.entries(themes.light.theme)
      .filter(([, def]) => def.scopes !== undefined)
      .map(([name, def]) => [camelToKebab(name), def.scopes]),
  );
  const componentScopes = Object.fromEntries(
    Object.entries(componentVars).flatMap(([component, vars]) =>
      Object.keys(vars)
        .map((key) => [`${component}-${key}`, keyGroup(key)] as const)
        .filter(([, g]) => g !== undefined)
        .map(([k, g]) => [k, [g]]),
    ),
  );
  writeFileSync(join(distDir, "scope-map.json"), JSON.stringify({
    propertyGroups: PROPERTY_GROUPS,
    semantic: semanticScopes,
    component: componentScopes,
    scales: SCALE_SCOPES,
  }, null, 2) + "\n");
  console.log("  wrote dist/scope-map.json");
```

- [ ] **Step 5: Full verify**

Run: `pnpm build && pnpm vitest run packages/tokens && node tools/check-docs-drift.mjs`
Expected: build green ("scope gate passed" ×4 themes, "wrote dist/scope-map.json"), tests PASS, drift check green.

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/scripts/ packages/tokens/__tests__/emit-json.test.ts packages/tokens/__tests__/emit-dtcg.test.ts
git commit -m "feat(tokens): D46 gate wired into build; scopes emitted to resolved JSON, DTCG, scope-map.json"
```

---

### Task 7: Stylelint secondary rule (`psi/token-scopes`)

**Files:**
- Modify: `tools/stylelint-plugin-psi-tokens.mjs` (export an array of two plugins)
- Modify: `.stylelintrc.json` (enable `psi/token-scopes`)
- Test: `packages/tokens/__tests__/stylelint-token-scopes.test.ts` (new; stylelint programmatic API)

**Interfaces:**
- Consumes: `packages/tokens/dist/scope-map.json` (Task 6 shape).
- Produces: stylelint rule `psi/token-scopes` — errors when a decl binds `var(--psi-X)` to a property outside X's expanded scopes. Skips: custom-property decls (`--*`), unscoped vars, missing scope map (build not run — the primary gate lives there).

- [ ] **Step 1: Write the failing test**

```ts
// packages/tokens/__tests__/stylelint-token-scopes.test.ts
import { describe, expect, it } from "vitest";
import stylelint from "stylelint";

const config = {
  plugins: ["../../tools/stylelint-plugin-psi-tokens.mjs"],
  rules: { "psi/token-scopes": true },
};

async function lintCSS(code: string) {
  const { results } = await stylelint.lint({ code, codeFilename: "widget.module.css", config });
  return results[0].warnings.map((w) => w.text);
}

describe("psi/token-scopes (D46 secondary gate)", () => {
  it("errors on a text-scoped semantic token as background", async () => {
    const warnings = await lintCSS(".x { background: var(--psi-fg-primary); }");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/--psi-fg-primary/);
  });

  it("errors on a surface-scoped component token as color", async () => {
    const warnings = await lintCSS(".x { color: var(--psi-button-accent-bg); }");
    expect(warnings).toHaveLength(1);
  });

  it("errors on a space token as width", async () => {
    const warnings = await lintCSS(".x { width: var(--psi-space-8); }");
    expect(warnings).toHaveLength(1);
  });

  it("passes in-scope bindings", async () => {
    expect(await lintCSS(".x { color: var(--psi-fg-primary); }")).toEqual([]);
    expect(await lintCSS(".x { background: var(--psi-button-accent-bg); }")).toEqual([]);
    expect(await lintCSS(".x { gap: var(--psi-space-8); padding: var(--psi-space-16); }")).toEqual([]);
  });

  it("skips custom-property declarations and unscoped tokens", async () => {
    expect(await lintCSS(".x { --local: var(--psi-fg-primary); }")).toEqual([]);
    expect(await lintCSS(".x { width: var(--psi-size-24); }")).toEqual([]); // size family unscoped
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm build && pnpm vitest run packages/tokens/__tests__/stylelint-token-scopes.test.ts`
(build first — the rule needs dist/scope-map.json)
Expected: FAIL — unknown rule `psi/token-scopes`.

- [ ] **Step 3: Implement**

Rewrite `tools/stylelint-plugin-psi-tokens.mjs` — keep the existing rule byte-identical, add the second and export both:

```js
// at top, after existing imports
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const scopeRuleName = "psi/token-scopes";
const mapPath = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "tokens", "dist", "scope-map.json");

/** D46 secondary gate. The token build is the primary gate; when the map
 * has not been generated yet (fresh clone, no pnpm build), skip silently. */
const scopeRule = (enabled) => (root, result) => {
  if (!enabled || !existsSync(mapPath)) return;
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  const expand = (scopes) =>
    new Set(scopes.flatMap((s) => map.propertyGroups[s] ?? [s]));
  const lookup = (name) => {
    const bare = name.slice("--psi-".length);
    const scaleFamily = Object.keys(map.scales).find((f) => bare.startsWith(`${f}-`));
    if (scaleFamily) return map.scales[scaleFamily];
    return map.semantic[bare] ?? map.component[bare];
  };
  root.walkDecls((decl) => {
    if (decl.prop.startsWith("--")) return; // assigning to a custom prop is not a property binding
    for (const m of decl.value.matchAll(/var\((--psi-[a-z0-9-]+)/g)) {
      const scopes = lookup(m[1]);
      if (!scopes) continue; // unscoped
      if (!expand(scopes).has(decl.prop)) {
        stylelint.utils.report({
          ruleName: scopeRuleName, result, node: decl,
          message: `${m[1]} is scoped to [${scopes.join(", ")}] and may not bind "${decl.prop}" (psi/token-scopes)`,
        });
      }
    }
  });
};
scopeRule.ruleName = scopeRuleName;
scopeRule.messages = stylelint.utils.ruleMessages(scopeRuleName, {});

export default [
  stylelint.createPlugin(ruleName, rule),
  stylelint.createPlugin(scopeRuleName, scopeRule),
];
```

(The existing `export default stylelint.createPlugin(ruleName, rule);` line is replaced by the array export above.)

`.stylelintrc.json` — add `"psi/token-scopes": true` next to the existing `"psi/component-tokens-only": true`.

- [ ] **Step 4: Run tests + lint the real repo**

Run: `pnpm vitest run packages/tokens/__tests__/stylelint-token-scopes.test.ts && pnpm lint`
Expected: tests PASS; `pnpm lint` green over the real component CSS. If real CSS fails, apply the Task 5 Step 4 judgment rule (genuine violation → report; deliberate design → the scope table is wrong, fix it there — never silence the rule).

- [ ] **Step 5: Commit**

```bash
git add tools/stylelint-plugin-psi-tokens.mjs .stylelintrc.json packages/tokens/__tests__/stylelint-token-scopes.test.ts
git commit -m "feat(lint): psi/token-scopes secondary gate over generated scope map"
```

---

### Task 8: Docs, changeset, final verify

**Files:**
- Modify: `packages/tokens/llms.txt` (artifact index + rules)
- Create: `.changeset/d46-token-scopes.md`

- [ ] **Step 1: Update `packages/tokens/llms.txt`**

Under "Machine-readable artifacts" add:

```
- dist/scope-map.json: D46 token scopes — property groups, per-token scopes (semantic + component), scale-family scopes
```

Under "Rules for generated code" add:

```
- Scoped tokens bind only their declared property groups (D46): fg* → text properties, bg*/fill*/scrim* → surfaces, border* → borders, --psi-space-* → gaps/padding/margin. Cross-family bindings that are design decisions carry both scopes (fgDanger: text+border for error borders; fillAccent: surface+border for selected controls). The token build enforces component bindings; stylelint (psi/token-scopes) enforces consumer CSS.
```

- [ ] **Step 2: Check react llms.txt / docs drift**

Run: `grep -rn "scope" packages/react/llms.txt docs/ --include="*.md" -il | head` — if the composition-contracts spec is the only hit, nothing else to update. Run `node tools/check-docs-drift.mjs`.
Expected: green.

- [ ] **Step 3: Changeset**

```md
---
"@handamade/psi-tokens": minor
---

D46 token scopes: semantic tokens declare the CSS property groups they may bind (`scopes` on token sources); the token build gates every component-token binding (through `oklch(from var())` derivations) and throws on violations; scopes are emitted into `dist/resolved/<theme>.json`, DTCG `$extensions.psi`, and a generated `dist/scope-map.json` consumed by the new `psi/token-scopes` stylelint rule. New inversion tokens `bgInverted`/`fgOnInverted` (tooltip rebind, zero visual change).
```

- [ ] **Step 4: Full gate + VR**

Run: `pnpm build && pnpm test && pnpm lint`
Expected: all green.
VR: zero visual diff is expected — CI's VR job (with the HAN-20 absolute `maxDiffPixels` gate) is the proof; a local `pnpm vr` on macOS is NOT meaningful (Linux baselines — see `apps/storybook/vr/README.md`).

- [ ] **Step 5: Commit + push + PR**

```bash
git add packages/tokens/llms.txt .changeset/d46-token-scopes.md
git commit -m "docs(tokens): D46 scopes in llms.txt + changeset"
git push -u origin dkurkin/han-14-d46-token-scopes-token-build-gate-stylelint-consumer-rule
gh pr create --title "D46 token scopes: build gate + stylelint consumer rule (HAN-14)" --body "..."
```

PR body: summarize the gate posture, the cross-family scope decisions (fgDanger, fillAccent), the inversion tokens, and link HAN-14. End with the standard generated-with footer.

---

## Self-Review Notes

- **Spec coverage:** scopes field (T2/T4) ✓; primary build gate w/ suffix map + derivation see-through (T5/T6) ✓; throw posture (T6) ✓; resolved JSON + DTCG `$extensions.psi` (T6) ✓; generated scope map + stylelint consumer rule (T7) ✓; unscoped-valid-everywhere (T5 tests) ✓; high-risk families first: text/surface (T4), gaps via `SCALE_SCOPES.space` + stylelint (T1/T6/T7) ✓; unknown-scope-entry error (T2) ✓; positive/negative tests per scoped family incl. derivations (T5) + stylelint cases (T7) ✓.
- **Known judgment points for the executor:** (1) Task 3 contrast-matrix pair shape must be read from the real file; (2) Task 5's "real inventory" tests are the moment latent violations surface — stop and report, don't tune scopes to pass; (3) Task 7's repo-wide lint may surface consumer CSS in `apps/` using semantic tokens on odd properties — same rule.
- **Type consistency:** `ScopeViolation`, `checkScopes`, `checkOverrideScopes`, `validateScopeConsistency`, `SCALE_SCOPES` names match across Tasks 1/2/5/6/7.

---

## Addendum (2026-07-20, during Task 5): fifth cross-family binding

The gate's real-inventory run found `switch.ts:6` `"thumb-bg": "var(--psi-fg-static-white)"` — a deliberate binding (white thumb disc, static across themes) absent from the pre-flight cross-family table (the audit grep only surfaced unsuffixed keys). Resolution follows the Task 3 precedent, not scope-widening (widening fgStaticWhite to surface would legalize the spec's motivating violation class for a heavily-used text token):

- New pure-ref token in light.ts AND dark.ts: `fillStaticWhite: token({ from: ref.fgStaticWhite, scopes: ["surface"] })` — byte-identical hex with fgStaticWhite in every theme.
- `switch.ts` rebinds: `"thumb-bg": "var(--psi-fill-static-white)"`.
- `inverted-tokens.test.ts` gains the hex-equality assertion `r.fillStaticWhite.hex === r.fgStaticWhite.hex` across all four themes.
- The theme tests needed no edits — they sample with toContain rather than enumerate (verified in review).
- The Task 4 scope table's surface row now includes `fillStaticWhite`.

## Addendum 2 (2026-07-20, during Task 7): secondary-gate catches on real CSS

First repo-wide run of `psi/token-scopes` flagged 8 declarations. Rulings:

- **Vocabulary omissions (5)** — `gap` group gains the 8 logical longhands (`padding/margin-inline/block-start/end`); `border` group gains the side shorthands (`border-top/right/bottom/left`, `border-inline`, `border-block`).
- **Edge-distance uses (2)** — `background-position` (Select icon offset) and `max-width` (Dialog viewport-inset calc) join the `gap` group: both express edge distance, the gap family's meaning. The theoretical "space token as element size" misuse this admits is not a plausible error class; color-category confusion is what the gate defends.
- **Checkbox checkmark hack (1)** — the ink token painted `border` (rotated-box glyph technique). Fixed in CSS, not vocabulary: `color: var(--psi-checkbox-check-fg); border: solid currentColor` — the var now binds a text property, the border inherits, rendering byte-identical. Widening the token to `["text","border"]` was rejected: unlike fgDanger (error borders are systemic), a glyph hack is an implementation detail, and currentColor lets the CSS say so.
