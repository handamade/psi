# DS Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@handamade/tokens` and `@handamade/react` — a themeable design system with OKLCH formula-based tokens, pixel-true scales, 8 core components, Storybook docs, a Figma sync plugin, and a customer-theme scaffolder.

**Architecture:** pnpm monorepo with 3 packages (`tokens`, `react`, `figma-plugin`) and 1 app (`storybook`). Tokens are authored as TypeScript formulas, codegen resolves them into live-calc CSS, static JSON, and TS types. React components consume only generated artifacts. A Figma plugin syncs resolved values into Figma variables.

**Tech Stack:** pnpm workspaces, TypeScript 5.7+, Vite, vitest, culori, React 19, CSS Modules, Storybook 9, changesets

---

## Milestones

| # | Milestone | Tasks | Proves |
|---|---|---|---|
| M1 | Monorepo + DSL + resolver | 1–3 | Formula DSL, validation, cycle detection |
| M2 | Palette + light theme + codegen | 4–6 | End-to-end: TS formulas → CSS + JSON + types |
| M3 | Dark theme + contrast + scales | 7–9 | Multi-theme, quality gate, utilities |
| M4 | Storybook | 10–11 | Generated token docs, theme switcher |
| M5 | Button + IconButton | 12–14 | Component tokens, derived states, sizes |
| M6 | Remaining 6 components + icons | 15–20 | Full component set |
| M7 | Figma plugin | 21–22 | Code → Figma sync |
| M8 | Customer theming + polish | 23–25 | Scaffolder, example theme, final docs |

## File map

```
ds/
├── pnpm-workspace.yaml
├── package.json                          root: scripts, devDeps (tsx, vitest, changesets)
├── tsconfig.base.json                    shared TS config
├── vitest.workspace.ts                   workspace-level vitest config
│
├── packages/tokens/
│   ├── package.json                      @handamade/tokens
│   ├── tsconfig.json
│   ├── src/
│   │   ├── dsl/
│   │   │   ├── types.ts                  TokenDef, ChannelOp, SlotRef, TokenRef types
│   │   │   ├── builders.ts              token(), set(), delta(), cap(), alpha, slot, ref
│   │   │   ├── resolver.ts              resolve formulas → {oklch, hex, formula} via culori
│   │   │   └── validator.ts             cycle detection, unknown ref/slot, duplicate name
│   │   ├── palettes/
│   │   │   └── default.ts               obsidian/platinum/sapphire/ruby/amber/emerald + slots
│   │   ├── themes/
│   │   │   ├── light.ts                 light theme formulas
│   │   │   ├── dark.ts                  dark theme formulas
│   │   │   └── customers/               customer theme directory
│   │   ├── scales/
│   │   │   ├── spacing.ts               --ds-space-{px} definitions
│   │   │   ├── sizes.ts                 --ds-size-{px} definitions
│   │   │   ├── radius.ts               --ds-radius-{px} definitions
│   │   │   └── typography.ts            --ds-text-{size}-{lh}-{weight} definitions
│   │   ├── components/
│   │   │   ├── button.ts                --ds-button-* token definitions
│   │   │   ├── input.ts                 --ds-input-* token definitions
│   │   │   ├── select.ts               --ds-select-* token definitions
│   │   │   ├── checkbox.ts             --ds-checkbox-* token definitions
│   │   │   ├── switch.ts               --ds-switch-* token definitions
│   │   │   ├── tag.ts                  --ds-tag-* token definitions
│   │   │   └── tooltip.ts             --ds-tooltip-* token definitions
│   │   └── contrast-matrix.ts           declared (fg, bg, ratio) pairings
│   ├── scripts/
│   │   ├── build.ts                     main codegen entry: load → validate → resolve → emit
│   │   ├── emit-css.ts                  generates CSS files with cascade layers
│   │   ├── emit-json.ts                 generates resolved/{theme}.json
│   │   ├── emit-types.ts               generates TS type unions
│   │   ├── emit-utilities.ts           generates utility classes
│   │   └── new-theme.ts                customer theme scaffolder
│   ├── dist/                            (generated, gitignored)
│   │   ├── base.css
│   │   ├── light.css
│   │   ├── dark.css
│   │   ├── utilities.css
│   │   ├── components/
│   │   ├── resolved/
│   │   └── types/
│   └── __tests__/
│       ├── resolver.test.ts
│       ├── validator.test.ts
│       ├── emit-css.test.ts
│       ├── contrast.test.ts
│       └── gamut.test.ts
│
├── packages/react/
│   ├── package.json                      @handamade/react
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                      barrel export
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── button.module.css
│   │   │   ├── Button.stories.tsx
│   │   │   └── Button.test.tsx
│   │   ├── IconButton/                   (same structure)
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Checkbox/
│   │   ├── Switch/
│   │   ├── Tag/
│   │   ├── Tooltip/
│   │   └── icons/
│   │       ├── index.ts
│   │       └── *.tsx                     ~16 icon components
│   └── vite.config.ts                    library build config
│
├── packages/figma-plugin/
│   ├── package.json                      private
│   ├── manifest.json                     Figma plugin manifest
│   ├── src/
│   │   ├── code.ts                       plugin main: read JSON → upsert variables
│   │   └── ui.html                       minimal UI: paste/load JSON, dry-run toggle
│   └── esbuild.config.ts                 plugin bundler
│
└── apps/storybook/
    ├── package.json
    ├── .storybook/
    │   ├── main.ts
    │   ├── preview.ts                    theme decorator, global CSS imports
    │   └── manager.ts                    theme-switcher addon
    └── src/
        ├── token-docs/
        │   ├── ColorTokens.stories.tsx   generated swatch tables
        │   ├── SpacingTokens.stories.tsx
        │   ├── TypographyTokens.stories.tsx
        │   └── token-reader.ts           reads dist/resolved/*.json
        └── welcome/
            └── Welcome.stories.tsx
```

---

## M1: Monorepo + DSL + Resolver (Tasks 1–3)

### Task 1: Monorepo scaffold

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json` (root)
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.npmrc`
- Create: `packages/tokens/package.json`
- Create: `packages/tokens/tsconfig.json`
- Create: `packages/react/package.json`
- Create: `packages/react/tsconfig.json`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "ds",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r run build",
    "dev": "pnpm run --filter @handamade/tokens --filter storybook dev --parallel",
    "test": "vitest run",
    "lint": "eslint ."
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.2.0",
    "tsx": "^4.19.0",
    "@changesets/cli": "^2.27.0"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 3: Create .npmrc**

```ini
shamefully-hoist=false
strict-peer-dependencies=true
```

- [ ] **Step 4: Create .gitignore**

```
node_modules
dist
*.tsbuildinfo
.turbo
```

- [ ] **Step 5: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 6: Create packages/tokens/package.json**

```json
{
  "name": "@handamade/tokens",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    "./base.css": "./dist/base.css",
    "./light.css": "./dist/light.css",
    "./dark.css": "./dist/dark.css",
    "./utilities.css": "./dist/utilities.css",
    "./components/*": "./dist/components/*",
    "./resolved/*": "./dist/resolved/*",
    "./types": "./dist/types/index.js"
  },
  "scripts": {
    "build": "tsx scripts/build.ts",
    "dev": "tsx --watch scripts/build.ts --watch"
  },
  "dependencies": {
    "culori": "^4.0.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 7: Create packages/tokens/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist/types"
  },
  "include": ["src"]
}
```

- [ ] **Step 8: Create packages/react/package.json**

```json
{
  "name": "@handamade/react",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./styles": "./dist/styles.css"
  },
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@handamade/tokens": "workspace:*"
  },
  "devDependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@handamade/tokens": "workspace:*",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0",
    "vite-plugin-css-modules": "^0.3.0"
  }
}
```

- [ ] **Step 9: Create packages/react/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 10: Install dependencies and verify**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm install`
Expected: lockfile created, no errors

- [ ] **Step 11: Create vitest.workspace.ts**

```ts
import { defineWorkspace } from "vitest/config";

export default defineWorkspace(["packages/*"]);
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm monorepo with tokens and react packages"
```

---

### Task 2: Formula DSL types and builders

**Files:**
- Create: `packages/tokens/src/dsl/types.ts`
- Create: `packages/tokens/src/dsl/builders.ts`

- [ ] **Step 1: Write failing test for builders**

Create `packages/tokens/__tests__/builders.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { token, set, delta, cap, slot, ref } from "../src/dsl/builders.js";

describe("token builder", () => {
  it("creates a token from a slot with set()", () => {
    const t = token({ from: slot.accent, l: set(0.65) });
    expect(t.from).toEqual({ type: "slot", name: "accent" });
    expect(t.l).toEqual({ op: "set", value: 0.65 });
    expect(t.c).toBeUndefined();
    expect(t.h).toBeUndefined();
    expect(t.alpha).toBeUndefined();
  });

  it("creates a token from a ref with alpha", () => {
    const t = token({ from: ref.fgPrimary, alpha: 0.7 });
    expect(t.from).toEqual({ type: "ref", name: "fgPrimary" });
    expect(t.alpha).toBe(0.7);
  });

  it("creates a token with cap()", () => {
    const t = token({ from: slot.accent, l: set(0.65), c: cap(0.23) });
    expect(t.c).toEqual({ op: "cap", value: 0.23 });
  });

  it("creates a token with delta()", () => {
    const t = token({ from: slot.canvas, l: delta(-0.017) });
    expect(t.l).toEqual({ op: "delta", value: -0.017 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm vitest run packages/tokens/__tests__/builders.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Create types.ts**

Create `packages/tokens/src/dsl/types.ts`:

```ts
export type ChannelOp =
  | { op: "set"; value: number }
  | { op: "delta"; value: number }
  | { op: "cap"; value: number };

export interface SlotRef {
  type: "slot";
  name: string;
}

export interface TokenRef {
  type: "ref";
  name: string;
}

export type TokenSource = SlotRef | TokenRef;

export interface TokenDef {
  from: TokenSource;
  l?: ChannelOp;
  c?: ChannelOp;
  h?: ChannelOp;
  alpha?: number;
}

export interface PaletteEntry {
  l: number;
  c: number;
  h: number;
}

export type Palette = Record<string, PaletteEntry>;

export interface SlotMap {
  ink: string;
  canvas: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
}

export type ThemeDef = Record<string, TokenDef>;

export interface ResolvedToken {
  name: string;
  oklch: { l: number; c: number; h: number; alpha?: number };
  hex: string;
  formula: string;
}
```

- [ ] **Step 4: Create builders.ts**

Create `packages/tokens/src/dsl/builders.ts`:

```ts
import type { ChannelOp, TokenDef, SlotRef, TokenRef } from "./types.js";

export function set(value: number): ChannelOp {
  return { op: "set", value };
}

export function delta(value: number): ChannelOp {
  return { op: "delta", value };
}

export function cap(value: number): ChannelOp {
  return { op: "cap", value };
}

export const slot = new Proxy({} as Record<string, SlotRef>, {
  get(_, name: string): SlotRef {
    return { type: "slot", name };
  },
});

export const ref = new Proxy({} as Record<string, TokenRef>, {
  get(_, name: string): TokenRef {
    return { type: "ref", name };
  },
});

export function token(
  def: Omit<TokenDef, "from"> & { from: SlotRef | TokenRef }
): TokenDef {
  return { ...def };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm vitest run packages/tokens/__tests__/builders.test.ts`
Expected: PASS — all 4 tests

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/src/dsl/ packages/tokens/__tests__/builders.test.ts
git commit -m "feat(tokens): formula DSL types and builders — set, delta, cap, slot, ref"
```

---

### Task 3: Validator (cycle detection, unknown refs/slots)

**Files:**
- Create: `packages/tokens/src/dsl/validator.ts`
- Create: `packages/tokens/__tests__/validator.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/tokens/__tests__/validator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validate, ValidationError } from "../src/dsl/validator.js";
import { token, set, delta, slot, ref } from "../src/dsl/builders.js";
import type { SlotMap, ThemeDef } from "../src/dsl/types.js";

const slots: SlotMap = {
  ink: "obsidian",
  canvas: "platinum",
  accent: "sapphire",
  success: "emerald",
  warning: "amber",
  danger: "ruby",
};

describe("validator", () => {
  it("accepts valid theme with slot and ref sources", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.ink, l: set(0.3) }),
      fgSecondary: token({ from: ref.fgPrimary, alpha: 0.7 }),
    };
    expect(() => validate(theme, slots)).not.toThrow();
  });

  it("rejects unknown slot name", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.nope, l: set(0.3) }),
    };
    expect(() => validate(theme, slots)).toThrow(ValidationError);
    expect(() => validate(theme, slots)).toThrow(/unknown slot "nope"/i);
  });

  it("rejects unknown ref name", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: ref.nonexistent, alpha: 0.5 }),
    };
    expect(() => validate(theme, slots)).toThrow(ValidationError);
    expect(() => validate(theme, slots)).toThrow(/unknown ref "nonexistent"/i);
  });

  it("detects direct circular ref", () => {
    const theme: ThemeDef = {
      a: token({ from: ref.b, l: set(0.5) }),
      b: token({ from: ref.a, l: set(0.5) }),
    };
    expect(() => validate(theme, slots)).toThrow(ValidationError);
    expect(() => validate(theme, slots)).toThrow(/circular/i);
  });

  it("detects transitive circular ref", () => {
    const theme: ThemeDef = {
      a: token({ from: ref.b, l: set(0.5) }),
      b: token({ from: ref.c, l: set(0.5) }),
      c: token({ from: ref.a, l: set(0.5) }),
    };
    expect(() => validate(theme, slots)).toThrow(ValidationError);
    expect(() => validate(theme, slots)).toThrow(/circular/i);
  });

  it("rejects duplicate token names (caught by TS, but runtime guard)", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.ink, l: set(0.3) }),
    };
    expect(() => validate(theme, slots, ["fgPrimary"])).toThrow(
      /duplicate.*fgPrimary/i
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm vitest run packages/tokens/__tests__/validator.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement validator**

Create `packages/tokens/src/dsl/validator.ts`:

```ts
import type { SlotMap, ThemeDef } from "./types.js";

export class ValidationError extends Error {
  constructor(
    message: string,
    public path: string
  ) {
    super(`${path}: ${message}`);
    this.name = "ValidationError";
  }
}

export function validate(
  theme: ThemeDef,
  slots: SlotMap,
  existingNames: string[] = []
): void {
  const tokenNames = new Set(Object.keys(theme));
  const validSlots = new Set(Object.keys(slots));

  for (const name of tokenNames) {
    if (existingNames.includes(name)) {
      throw new ValidationError(`duplicate token name "${name}"`, name);
    }
  }

  for (const [name, def] of Object.entries(theme)) {
    if (def.from.type === "slot") {
      if (!validSlots.has(def.from.name)) {
        throw new ValidationError(
          `unknown slot "${def.from.name}"`,
          name
        );
      }
    } else if (def.from.type === "ref") {
      if (!tokenNames.has(def.from.name)) {
        throw new ValidationError(
          `unknown ref "${def.from.name}"`,
          name
        );
      }
    }
  }

  detectCycles(theme);
}

function detectCycles(theme: ThemeDef): void {
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function visit(name: string, path: string[]): void {
    if (inStack.has(name)) {
      throw new ValidationError(
        `circular reference: ${[...path, name].join(" → ")}`,
        name
      );
    }
    if (visited.has(name)) return;

    inStack.add(name);
    const def = theme[name];
    if (def?.from.type === "ref" && name !== def.from.name) {
      visit(def.from.name, [...path, name]);
    }
    inStack.delete(name);
    visited.add(name);
  }

  for (const name of Object.keys(theme)) {
    visit(name, []);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm vitest run packages/tokens/__tests__/validator.test.ts`
Expected: PASS — all 6 tests

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/src/dsl/validator.ts packages/tokens/__tests__/validator.test.ts
git commit -m "feat(tokens): validator with cycle detection, unknown slot/ref checks"
```

---

## M2: Palette + Light Theme + Codegen (Tasks 4–6)

### Task 4: Resolver — formulas to resolved OKLCH+hex via culori

**Files:**
- Create: `packages/tokens/src/dsl/resolver.ts`
- Create: `packages/tokens/__tests__/resolver.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/tokens/__tests__/resolver.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolve } from "../src/dsl/resolver.js";
import { token, set, delta, cap, slot, ref } from "../src/dsl/builders.js";
import type { Palette, SlotMap, ThemeDef } from "../src/dsl/types.js";

const palette: Palette = {
  obsidian: { l: 0.25, c: 0.02, h: 250 },
  platinum: { l: 0.95, c: 0.005, h: 250 },
  sapphire: { l: 0.55, c: 0.21, h: 260 },
};

const slots: SlotMap = {
  ink: "obsidian",
  canvas: "platinum",
  accent: "sapphire",
  success: "sapphire",
  warning: "sapphire",
  danger: "sapphire",
};

describe("resolver", () => {
  it("resolves set() on lightness", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.ink, l: set(0.3), c: set(0.03) }),
    };
    const resolved = resolve(theme, palette, slots);
    expect(resolved.fgPrimary.oklch.l).toBeCloseTo(0.3, 2);
    expect(resolved.fgPrimary.oklch.c).toBeCloseTo(0.03, 2);
    expect(resolved.fgPrimary.oklch.h).toBeCloseTo(250, 0);
    expect(resolved.fgPrimary.hex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("resolves delta()", () => {
    const theme: ThemeDef = {
      fillN: token({ from: slot.canvas, l: delta(-0.05) }),
    };
    const resolved = resolve(theme, palette, slots);
    expect(resolved.fillN.oklch.l).toBeCloseTo(0.9, 2);
  });

  it("resolves cap() — clamps chroma", () => {
    const theme: ThemeDef = {
      fgAccent: token({ from: slot.accent, l: set(0.65), c: cap(0.15) }),
    };
    const resolved = resolve(theme, palette, slots);
    expect(resolved.fgAccent.oklch.c).toBeLessThanOrEqual(0.15 + 0.001);
  });

  it("resolves alpha", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.ink, l: set(0.3) }),
      fgSecondary: token({ from: ref.fgPrimary, alpha: 0.7 }),
    };
    const resolved = resolve(theme, palette, slots);
    expect(resolved.fgSecondary.oklch.alpha).toBeCloseTo(0.7, 2);
  });

  it("resolves ref chains", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.ink, l: set(0.3) }),
      fgSecondary: token({ from: ref.fgPrimary, alpha: 0.7 }),
      fgTertiary: token({ from: ref.fgPrimary, alpha: 0.5 }),
    };
    const resolved = resolve(theme, palette, slots);
    expect(resolved.fgSecondary.oklch.l).toBeCloseTo(0.3, 2);
    expect(resolved.fgTertiary.oklch.alpha).toBeCloseTo(0.5, 2);
  });

  it("generates formula strings", () => {
    const theme: ThemeDef = {
      fgAccent: token({ from: slot.accent, l: set(0.65), c: cap(0.23) }),
    };
    const resolved = resolve(theme, palette, slots);
    expect(resolved.fgAccent.formula).toContain("accent");
  });

  it("applies gamut mapping — hex is sRGB-safe", () => {
    const widePalette: Palette = {
      neon: { l: 0.8, c: 0.4, h: 150 },
    };
    const wideSlots: SlotMap = {
      ...slots,
      accent: "neon",
    };
    const theme: ThemeDef = {
      fg: token({ from: slot.accent, l: set(0.8) }),
    };
    const resolved = resolve(theme, widePalette, wideSlots);
    const hexNum = parseInt(resolved.fg.hex.slice(1), 16);
    expect(hexNum).toBeGreaterThanOrEqual(0);
    expect(hexNum).toBeLessThanOrEqual(0xffffff);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm vitest run packages/tokens/__tests__/resolver.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement resolver**

Create `packages/tokens/src/dsl/resolver.ts`:

```ts
import { oklch, formatHex, clampChroma } from "culori";
import type {
  ChannelOp,
  Palette,
  SlotMap,
  ThemeDef,
  TokenDef,
  ResolvedToken,
} from "./types.js";

export type ResolvedTheme = Record<string, ResolvedToken>;

function applyOp(
  base: number,
  op: ChannelOp | undefined
): number {
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

function formatFormula(def: TokenDef): string {
  const source =
    def.from.type === "slot"
      ? `slot(${def.from.name})`
      : `ref(${def.from.name})`;

  const mods: string[] = [];
  if (def.l) mods.push(`L ${def.l.op}(${def.l.value})`);
  if (def.c) mods.push(`C ${def.c.op}(${def.c.value})`);
  if (def.h) mods.push(`H ${def.h.op}(${def.h.value})`);
  if (def.alpha != null) mods.push(`alpha(${def.alpha})`);

  return mods.length > 0
    ? `${source} → ${mods.join(", ")}`
    : source;
}

export function resolve(
  theme: ThemeDef,
  palette: Palette,
  slots: SlotMap
): ResolvedTheme {
  const resolved: ResolvedTheme = {};
  const resolving = new Set<string>();

  function resolveToken(name: string): ResolvedToken {
    if (resolved[name]) return resolved[name];
    if (resolving.has(name)) {
      throw new Error(`circular reference at "${name}"`);
    }
    resolving.add(name);

    const def = theme[name];
    let baseL: number;
    let baseC: number;
    let baseH: number;

    if (def.from.type === "slot") {
      const paletteName = slots[def.from.name as keyof SlotMap];
      const entry = palette[paletteName];
      baseL = entry.l;
      baseC = entry.c;
      baseH = entry.h;
    } else {
      const refResolved = resolveToken(def.from.name);
      baseL = refResolved.oklch.l;
      baseC = refResolved.oklch.c;
      baseH = refResolved.oklch.h;
    }

    const l = applyOp(baseL, def.l);
    const c = applyOp(baseC, def.c);
    const h = applyOp(baseH, def.h);
    const alpha = def.alpha;

    const color = { mode: "oklch" as const, l, c, h, alpha };
    const clamped = clampChroma(color, "oklch");
    const hex = formatHex(clamped);

    const result: ResolvedToken = {
      name,
      oklch: { l, c, h, ...(alpha != null ? { alpha } : {}) },
      hex,
      formula: formatFormula(def),
    };

    resolving.delete(name);
    resolved[name] = result;
    return result;
  }

  for (const name of Object.keys(theme)) {
    resolveToken(name);
  }

  return resolved;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm vitest run packages/tokens/__tests__/resolver.test.ts`
Expected: PASS — all 7 tests

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/src/dsl/resolver.ts packages/tokens/__tests__/resolver.test.ts
git commit -m "feat(tokens): resolver — formulas to OKLCH+hex via culori with gamut clamping"
```

---

### Task 5: Default palette + slot map + light theme definition

**Files:**
- Create: `packages/tokens/src/palettes/default.ts`
- Create: `packages/tokens/src/themes/light.ts`

- [ ] **Step 1: Write failing test for light theme resolution**

Create `packages/tokens/__tests__/light-theme.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validate } from "../src/dsl/validator.js";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";

describe("light theme", () => {
  it("passes validation", () => {
    expect(() => validate(lightTheme, defaultSlots)).not.toThrow();
  });

  it("resolves all tokens", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    const names = Object.keys(resolved);
    expect(names).toContain("bgPrimary");
    expect(names).toContain("bgSecondary");
    expect(names).toContain("fgPrimary");
    expect(names).toContain("fgSecondary");
    expect(names).toContain("fgTertiary");
    expect(names).toContain("fgQuaternary");
    expect(names).toContain("fgPrimaryInverted");
    expect(names).toContain("fgStaticWhite");
    expect(names).toContain("fgAccent");
    expect(names).toContain("fgSuccess");
    expect(names).toContain("fgWarning");
    expect(names).toContain("fgDanger");
    expect(names).toContain("fillNeutral1");
    expect(names).toContain("fillNeutral6");
    expect(names).toContain("fillAccent");
    expect(names).toContain("fillTintAccent");
    expect(names).toContain("borderNeutral");
    expect(names).toContain("borderStrong");
    expect(names).toContain("borderFocus");
  });

  it("fgPrimary has low lightness (dark text on light bg)", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    expect(resolved.fgPrimary.oklch.l).toBeLessThan(0.4);
  });

  it("bgPrimary has high lightness", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    expect(resolved.bgPrimary.oklch.l).toBeGreaterThan(0.9);
  });

  it("fgAccent chroma is capped at 0.23", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    expect(resolved.fgAccent.oklch.c).toBeLessThanOrEqual(0.23 + 0.001);
  });

  it("fillTintAccent has alpha 0.12", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    expect(resolved.fillTintAccent.oklch.alpha).toBeCloseTo(0.12, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm vitest run packages/tokens/__tests__/light-theme.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Create default palette**

Create `packages/tokens/src/palettes/default.ts`:

```ts
import type { Palette, SlotMap } from "../dsl/types.js";

export const defaultPalette: Palette = {
  obsidian: { l: 0.25, c: 0.02, h: 250 },
  platinum: { l: 0.95, c: 0.005, h: 250 },
  sapphire: { l: 0.55, c: 0.21, h: 260 },
  ruby: { l: 0.55, c: 0.22, h: 25 },
  amber: { l: 0.75, c: 0.18, h: 75 },
  emerald: { l: 0.6, c: 0.19, h: 155 },
  white: { l: 1.0, c: 0, h: 0 },
  black: { l: 0.0, c: 0, h: 0 },
};

export const defaultSlots: SlotMap = {
  ink: "obsidian",
  canvas: "platinum",
  accent: "sapphire",
  success: "emerald",
  warning: "amber",
  danger: "ruby",
};
```

- [ ] **Step 4: Create light theme**

Create `packages/tokens/src/themes/light.ts`:

```ts
import { token, set, delta, cap, slot, ref } from "../dsl/builders.js";
import type { ThemeDef } from "../dsl/types.js";

export const lightTheme: ThemeDef = {
  bgPrimary: token({ from: slot.canvas }),
  bgSecondary: token({ from: slot.canvas, l: delta(+0.03) }),

  fgPrimary: token({ from: slot.ink, l: set(0.3), c: set(0.03) }),
  fgSecondary: token({ from: ref.fgPrimary, alpha: 0.7 }),
  fgTertiary: token({ from: ref.fgPrimary, alpha: 0.5 }),
  fgQuaternary: token({ from: ref.fgPrimary, alpha: 0.3 }),
  fgPrimaryInverted: token({ from: slot.canvas }),
  fgStaticWhite: token({ from: slot.canvas, l: set(1.0), c: set(0) }),

  fgAccent: token({ from: slot.accent, l: set(0.65), c: cap(0.23) }),
  fgSuccess: token({ from: slot.success, l: set(0.65), c: cap(0.23) }),
  fgWarning: token({ from: slot.warning, l: set(0.65), c: cap(0.23) }),
  fgDanger: token({ from: slot.danger, l: set(0.65), c: cap(0.23) }),

  fillNeutral1: token({ from: slot.canvas, l: delta(+0.016), c: delta(-0.001) }),
  fillNeutral2: token({ from: slot.canvas }),
  fillNeutral3: token({ from: slot.canvas, l: delta(-0.017), c: delta(+0.001) }),
  fillNeutral4: token({ from: slot.canvas, l: delta(-0.034), c: delta(+0.002) }),
  fillNeutral5: token({ from: slot.canvas, l: delta(-0.052), c: delta(+0.003) }),
  fillNeutral6: token({ from: slot.canvas, l: delta(-0.068), c: delta(+0.004) }),

  fillAccent: token({ from: slot.accent }),
  fillSuccess: token({ from: slot.success }),
  fillWarning: token({ from: slot.warning }),
  fillDanger: token({ from: slot.danger }),

  fillTintAccent: token({ from: ref.fgAccent, alpha: 0.12 }),
  fillTintSuccess: token({ from: ref.fgSuccess, alpha: 0.12 }),
  fillTintWarning: token({ from: ref.fgWarning, alpha: 0.12 }),
  fillTintDanger: token({ from: ref.fgDanger, alpha: 0.12 }),

  borderNeutral: token({ from: ref.fgPrimary, alpha: 0.15 }),
  borderStrong: token({ from: ref.fgPrimary, alpha: 0.3 }),
  borderFocus: token({ from: ref.fgAccent }),
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm vitest run packages/tokens/__tests__/light-theme.test.ts`
Expected: PASS — all 6 tests

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/src/palettes/ packages/tokens/src/themes/light.ts packages/tokens/__tests__/light-theme.test.ts
git commit -m "feat(tokens): default palette, slot map, and light theme definition"
```

---

### Task 6: Codegen — CSS emitter + JSON emitter + types emitter

**Files:**
- Create: `packages/tokens/scripts/build.ts`
- Create: `packages/tokens/scripts/emit-css.ts`
- Create: `packages/tokens/scripts/emit-json.ts`
- Create: `packages/tokens/scripts/emit-types.ts`
- Create: `packages/tokens/__tests__/emit-css.test.ts`

- [ ] **Step 1: Write failing test for CSS emission**

Create `packages/tokens/__tests__/emit-css.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emitBaseCSS, emitThemeCSS } from "../scripts/emit-css.js";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import type { Palette, SlotMap } from "../src/dsl/types.js";

describe("emitBaseCSS", () => {
  it("emits palette vars inside @layer ds.base", () => {
    const css = emitBaseCSS(defaultPalette);
    expect(css).toContain("@layer ds.base");
    expect(css).toContain("--ds-palette-obsidian");
    expect(css).toContain("--ds-palette-sapphire");
    expect(css).toContain("oklch(");
  });
});

describe("emitThemeCSS", () => {
  it("emits semantic tokens inside @layer ds.theme", () => {
    const css = emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots);
    expect(css).toContain("@layer ds.theme");
    expect(css).toContain("--ds-bg-primary");
    expect(css).toContain("--ds-fg-accent");
    expect(css).toContain("--ds-fill-tint-accent");
  });

  it("light theme targets :root and [data-ds-theme='light']", () => {
    const css = emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots);
    expect(css).toContain(":root");
    expect(css).toContain('[data-ds-theme="light"]');
  });

  it("uses live oklch(from var(...) ...) form for slot-sourced tokens", () => {
    const css = emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots);
    expect(css).toMatch(/oklch\(from var\(--ds-palette-/);
  });

  it("uses live var() form for ref-sourced tokens", () => {
    const css = emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots);
    expect(css).toMatch(/oklch\(from var\(--ds-fg-primary\)/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm vitest run packages/tokens/__tests__/emit-css.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement emit-css.ts**

Create `packages/tokens/scripts/emit-css.ts`:

```ts
import type {
  ChannelOp,
  Palette,
  SlotMap,
  ThemeDef,
  TokenDef,
} from "../src/dsl/types.js";

function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function paletteVar(name: string): string {
  return `--ds-palette-${name}`;
}

function tokenVar(name: string): string {
  return `--ds-${camelToKebab(name)}`;
}

function opToCSS(channel: string, op: ChannelOp): string {
  switch (op.op) {
    case "set":
      return `${op.value}`;
    case "delta":
      return op.value >= 0
        ? `calc(${channel} + ${op.value})`
        : `calc(${channel} - ${Math.abs(op.value)})`;
    case "cap":
      return `min(${channel}, ${op.value})`;
  }
}

function tokenToLiveCSS(
  def: TokenDef,
  slots: SlotMap
): string {
  let fromVar: string;
  if (def.from.type === "slot") {
    const paletteName = slots[def.from.name as keyof SlotMap];
    fromVar = `var(${paletteVar(paletteName)})`;
  } else {
    fromVar = `var(${tokenVar(def.from.name)})`;
  }

  const hasChannelMods = def.l || def.c || def.h;
  const hasAlpha = def.alpha != null;

  if (!hasChannelMods && !hasAlpha) {
    return fromVar;
  }

  const l = def.l ? opToCSS("l", def.l) : "l";
  const c = def.c ? opToCSS("c", def.c) : "c";
  const h = def.h ? opToCSS("h", def.h) : "h";

  if (hasAlpha) {
    return `oklch(from ${fromVar} ${l} ${c} ${h} / ${def.alpha})`;
  }

  return `oklch(from ${fromVar} ${l} ${c} ${h})`;
}

export function emitBaseCSS(palette: Palette): string {
  const vars = Object.entries(palette)
    .map(([name, { l, c, h }]) => `  ${paletteVar(name)}: oklch(${l} ${c} ${h});`)
    .join("\n");

  return `@layer ds.base {\n  :root {\n${vars}\n  }\n}\n`;
}

export function emitThemeCSS(
  themeName: string,
  theme: ThemeDef,
  palette: Palette,
  slots: SlotMap
): string {
  const vars = Object.entries(theme)
    .map(([name, def]) => `    ${tokenVar(name)}: ${tokenToLiveCSS(def, slots)};`)
    .join("\n");

  const selector =
    themeName === "light"
      ? `:root,\n  [data-ds-theme="light"]`
      : `[data-ds-theme="${themeName}"]`;

  return `@layer ds.theme {\n  ${selector} {\n${vars}\n  }\n}\n`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm vitest run packages/tokens/__tests__/emit-css.test.ts`
Expected: PASS — all 5 tests

- [ ] **Step 5: Implement emit-json.ts**

Create `packages/tokens/scripts/emit-json.ts`:

```ts
import type { ResolvedToken } from "../src/dsl/types.js";
import type { ResolvedTheme } from "../src/dsl/resolver.js";

export function emitResolvedJSON(
  themeName: string,
  resolved: ResolvedTheme
): string {
  const tokens: ResolvedToken[] = Object.values(resolved);
  return JSON.stringify({ theme: themeName, tokens }, null, 2);
}
```

- [ ] **Step 6: Implement emit-types.ts**

Create `packages/tokens/scripts/emit-types.ts`:

```ts
import type { ThemeDef } from "../src/dsl/types.js";

function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function emitTokenTypes(
  themes: Record<string, ThemeDef>,
  sizes: number[],
  variants: string[]
): string {
  const allTokenNames = new Set<string>();
  for (const theme of Object.values(themes)) {
    for (const name of Object.keys(theme)) {
      allTokenNames.add(name);
    }
  }

  const tokenNameUnion = [...allTokenNames]
    .map((n) => `"--ds-${camelToKebab(n)}"`)
    .join(" | ");

  const themeNameUnion = Object.keys(themes)
    .map((n) => `"${n}"`)
    .join(" | ");

  const sizeUnion = sizes.map((s) => `${s}`).join(" | ");
  const variantUnion = variants.map((v) => `"${v}"`).join(" | ");

  return [
    `export type TokenName = ${tokenNameUnion};`,
    `export type ThemeName = ${themeNameUnion};`,
    `export type Size = ${sizeUnion};`,
    `export type Variant = ${variantUnion};`,
    "",
  ].join("\n");
}
```

- [ ] **Step 7: Implement build.ts**

Create `packages/tokens/scripts/build.ts`:

```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve as pathResolve } from "node:path";
import { validate } from "../src/dsl/validator.js";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { emitBaseCSS, emitThemeCSS } from "./emit-css.js";
import { emitResolvedJSON } from "./emit-json.js";
import { emitTokenTypes } from "./emit-types.js";

const dist = pathResolve(import.meta.dirname, "../dist");
const resolvedDir = pathResolve(dist, "resolved");
const typesDir = pathResolve(dist, "types");
const componentsDir = pathResolve(dist, "components");

mkdirSync(resolvedDir, { recursive: true });
mkdirSync(typesDir, { recursive: true });
mkdirSync(componentsDir, { recursive: true });

const themes: Record<string, typeof lightTheme> = {
  light: lightTheme,
};

const sizes = [24, 32, 40, 48];
const variants = [
  "accent",
  "accent-subtle",
  "neutral",
  "neutral-subtle",
  "ghost",
  "danger",
  "danger-subtle",
];

for (const [name, theme] of Object.entries(themes)) {
  console.log(`Processing theme: ${name}`);
  validate(theme, defaultSlots);
  const resolved = resolve(theme, defaultPalette, defaultSlots);

  writeFileSync(
    pathResolve(dist, `${name}.css`),
    emitThemeCSS(name, theme, defaultPalette, defaultSlots)
  );
  writeFileSync(
    pathResolve(resolvedDir, `${name}.json`),
    emitResolvedJSON(name, resolved)
  );
}

writeFileSync(pathResolve(dist, "base.css"), emitBaseCSS(defaultPalette));
writeFileSync(
  pathResolve(typesDir, "index.ts"),
  emitTokenTypes(themes, sizes, variants)
);

console.log("Build complete.");
```

- [ ] **Step 8: Run build and verify outputs exist**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm --filter @handamade/tokens build && ls packages/tokens/dist/ && cat packages/tokens/dist/base.css | head -5`
Expected: dist/ contains base.css, light.css, resolved/, types/

- [ ] **Step 9: Commit**

```bash
git add packages/tokens/scripts/ packages/tokens/__tests__/emit-css.test.ts
git commit -m "feat(tokens): codegen pipeline — CSS, JSON, and type emitters + build script"
```

---

## M3: Dark Theme + Contrast Matrix + Scales (Tasks 7–9)

### Task 7: Dark theme definition

**Files:**
- Create: `packages/tokens/src/themes/dark.ts`
- Create: `packages/tokens/__tests__/dark-theme.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/tokens/__tests__/dark-theme.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validate } from "../src/dsl/validator.js";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { darkTheme } from "../src/themes/dark.js";

describe("dark theme", () => {
  it("passes validation", () => {
    expect(() => validate(darkTheme, defaultSlots)).not.toThrow();
  });

  it("has the same token names as expected", () => {
    const resolved = resolve(darkTheme, defaultPalette, defaultSlots);
    expect(Object.keys(resolved)).toContain("bgPrimary");
    expect(Object.keys(resolved)).toContain("fgPrimary");
    expect(Object.keys(resolved)).toContain("fgAccent");
    expect(Object.keys(resolved)).toContain("fillTintAccent");
  });

  it("fgPrimary has high lightness (light text on dark bg)", () => {
    const resolved = resolve(darkTheme, defaultPalette, defaultSlots);
    expect(resolved.fgPrimary.oklch.l).toBeGreaterThan(0.8);
  });

  it("bgPrimary has low lightness", () => {
    const resolved = resolve(darkTheme, defaultPalette, defaultSlots);
    expect(resolved.bgPrimary.oklch.l).toBeLessThan(0.25);
  });
});
```

- [ ] **Step 2: Create dark theme**

Create `packages/tokens/src/themes/dark.ts`:

```ts
import { token, set, delta, cap, slot, ref } from "../dsl/builders.js";
import type { ThemeDef } from "../dsl/types.js";

export const darkTheme: ThemeDef = {
  bgPrimary: token({ from: slot.ink, l: set(0.15), c: set(0.01) }),
  bgSecondary: token({ from: slot.ink, l: set(0.2), c: set(0.015) }),

  fgPrimary: token({ from: slot.canvas, l: set(0.93), c: set(0.01) }),
  fgSecondary: token({ from: ref.fgPrimary, alpha: 0.7 }),
  fgTertiary: token({ from: ref.fgPrimary, alpha: 0.5 }),
  fgQuaternary: token({ from: ref.fgPrimary, alpha: 0.3 }),
  fgPrimaryInverted: token({ from: slot.ink, l: set(0.15) }),
  fgStaticWhite: token({ from: slot.canvas, l: set(1.0), c: set(0) }),

  fgAccent: token({ from: slot.accent, l: set(0.75), c: cap(0.23) }),
  fgSuccess: token({ from: slot.success, l: set(0.75), c: cap(0.23) }),
  fgWarning: token({ from: slot.warning, l: set(0.75), c: cap(0.23) }),
  fgDanger: token({ from: slot.danger, l: set(0.75), c: cap(0.23) }),

  fillNeutral1: token({ from: slot.ink, l: set(0.18), c: set(0.012) }),
  fillNeutral2: token({ from: slot.ink, l: set(0.2), c: set(0.015) }),
  fillNeutral3: token({ from: slot.ink, l: set(0.23), c: set(0.018) }),
  fillNeutral4: token({ from: slot.ink, l: set(0.26), c: set(0.02) }),
  fillNeutral5: token({ from: slot.ink, l: set(0.29), c: set(0.022) }),
  fillNeutral6: token({ from: slot.ink, l: set(0.32), c: set(0.025) }),

  fillAccent: token({ from: slot.accent }),
  fillSuccess: token({ from: slot.success }),
  fillWarning: token({ from: slot.warning }),
  fillDanger: token({ from: slot.danger }),

  fillTintAccent: token({ from: ref.fgAccent, alpha: 0.15 }),
  fillTintSuccess: token({ from: ref.fgSuccess, alpha: 0.15 }),
  fillTintWarning: token({ from: ref.fgWarning, alpha: 0.15 }),
  fillTintDanger: token({ from: ref.fgDanger, alpha: 0.15 }),

  borderNeutral: token({ from: ref.fgPrimary, alpha: 0.15 }),
  borderStrong: token({ from: ref.fgPrimary, alpha: 0.3 }),
  borderFocus: token({ from: ref.fgAccent }),
};
```

- [ ] **Step 3: Run tests and verify**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm vitest run packages/tokens/__tests__/dark-theme.test.ts`
Expected: PASS — all 4 tests

- [ ] **Step 4: Add dark theme to build.ts**

In `packages/tokens/scripts/build.ts`, add import and register:

```ts
import { darkTheme } from "../src/themes/dark.js";

// In the themes object:
const themes: Record<string, typeof lightTheme> = {
  light: lightTheme,
  dark: darkTheme,
};
```

- [ ] **Step 5: Rebuild and verify dark.css exists**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm --filter @handamade/tokens build && ls packages/tokens/dist/`
Expected: dark.css present alongside light.css and base.css

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/src/themes/dark.ts packages/tokens/__tests__/dark-theme.test.ts packages/tokens/scripts/build.ts
git commit -m "feat(tokens): dark theme definition + codegen integration"
```

---

### Task 8: Contrast matrix

**Files:**
- Create: `packages/tokens/src/contrast-matrix.ts`
- Create: `packages/tokens/__tests__/contrast.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/tokens/__tests__/contrast.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  contrastPairs,
  checkContrast,
  type ContrastResult,
} from "../src/contrast-matrix.js";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";

describe("contrast matrix", () => {
  it("defines pairs with minimum ratios", () => {
    expect(contrastPairs.length).toBeGreaterThan(0);
    for (const pair of contrastPairs) {
      expect(pair.minRatio).toBeGreaterThanOrEqual(3);
    }
  });

  it("light theme passes all declared pairs", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    const results = checkContrast(resolved, contrastPairs);
    const failures = results.filter((r) => !r.pass);
    if (failures.length > 0) {
      console.table(
        failures.map((f) => ({
          fg: f.fg,
          bg: f.bg,
          ratio: f.ratio.toFixed(2),
          required: f.minRatio,
        }))
      );
    }
    expect(failures).toEqual([]);
  });

  it("dark theme passes all declared pairs", () => {
    const resolved = resolve(darkTheme, defaultPalette, defaultSlots);
    const results = checkContrast(resolved, contrastPairs);
    const failures = results.filter((r) => !r.pass);
    if (failures.length > 0) {
      console.table(
        failures.map((f) => ({
          fg: f.fg,
          bg: f.bg,
          ratio: f.ratio.toFixed(2),
          required: f.minRatio,
        }))
      );
    }
    expect(failures).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement contrast-matrix.ts**

Create `packages/tokens/src/contrast-matrix.ts`:

```ts
import { wcagContrast, parse } from "culori";
import type { ResolvedToken } from "./dsl/types.js";
import type { ResolvedTheme } from "./dsl/resolver.js";

export interface ContrastPair {
  fg: string;
  bg: string;
  minRatio: number;
}

export interface ContrastResult extends ContrastPair {
  ratio: number;
  pass: boolean;
}

export const contrastPairs: ContrastPair[] = [
  // fg-primary / fg-secondary on backgrounds
  ...["bgPrimary", "bgSecondary", ...Array.from({ length: 6 }, (_, i) => `fillNeutral${i + 1}`)].flatMap((bg) => [
    { fg: "fgPrimary", bg, minRatio: 4.5 },
    { fg: "fgSecondary", bg, minRatio: 4.5 },
  ]),
  // status fg on bg-primary
  ...["fgAccent", "fgSuccess", "fgWarning", "fgDanger"].map((fg) => ({
    fg,
    bg: "bgPrimary",
    minRatio: 4.5,
  })),
  // status fg on their tint fills
  { fg: "fgAccent", bg: "fillTintAccent", minRatio: 4.5 },
  { fg: "fgSuccess", bg: "fillTintSuccess", minRatio: 4.5 },
  { fg: "fgWarning", bg: "fillTintWarning", minRatio: 4.5 },
  { fg: "fgDanger", bg: "fillTintDanger", minRatio: 4.5 },
];

function resolvedToHex(
  token: ResolvedToken,
  bgToken?: ResolvedToken
): string {
  if (token.oklch.alpha != null && token.oklch.alpha < 1 && bgToken) {
    const fg = token.oklch;
    const bg = bgToken.oklch;
    const a = fg.alpha!;
    const l = fg.l * a + bg.l * (1 - a);
    const c = fg.c * a + bg.c * (1 - a);
    const h = fg.h || bg.h;
    const { formatHex, clampChroma } = require("culori");
    const mixed = clampChroma({ mode: "oklch", l, c, h }, "oklch");
    return formatHex(mixed);
  }
  return token.hex;
}

export function checkContrast(
  resolved: ResolvedTheme,
  pairs: ContrastPair[]
): ContrastResult[] {
  return pairs.map((pair) => {
    const fgToken = resolved[pair.fg];
    const bgToken = resolved[pair.bg];
    if (!fgToken || !bgToken) {
      return { ...pair, ratio: 0, pass: false };
    }

    let fgHex: string;
    if (fgToken.oklch.alpha != null && fgToken.oklch.alpha < 1) {
      const a = fgToken.oklch.alpha;
      const fl = fgToken.oklch.l;
      const fc = fgToken.oklch.c;
      const bl = bgToken.oklch.l;
      const bc = bgToken.oklch.c;
      const h = fgToken.oklch.h || bgToken.oklch.h;

      const { formatHex, clampChroma } = require("culori") as typeof import("culori");
      const mixed = clampChroma(
        { mode: "oklch" as const, l: fl * a + bl * (1 - a), c: fc * a + bc * (1 - a), h },
        "oklch"
      );
      fgHex = formatHex(mixed);
    } else {
      fgHex = fgToken.hex;
    }

    let bgHex: string;
    if (bgToken.oklch.alpha != null && bgToken.oklch.alpha < 1) {
      bgHex = bgToken.hex;
    } else {
      bgHex = bgToken.hex;
    }

    const fgParsed = parse(fgHex);
    const bgParsed = parse(bgHex);
    if (!fgParsed || !bgParsed) {
      return { ...pair, ratio: 0, pass: false };
    }

    const ratio = wcagContrast(fgParsed, bgParsed);
    return { ...pair, ratio, pass: ratio >= pair.minRatio };
  });
}
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm vitest run packages/tokens/__tests__/contrast.test.ts`
Expected: PASS — if any pairs fail, adjust the theme L/C values in light.ts or dark.ts until they pass, then re-run

- [ ] **Step 4: Commit**

```bash
git add packages/tokens/src/contrast-matrix.ts packages/tokens/__tests__/contrast.test.ts
git commit -m "feat(tokens): WCAG contrast matrix — build-time validation for all (fg, bg) pairs"
```

---

### Task 9: Scales + utility CSS generation

**Files:**
- Create: `packages/tokens/src/scales/spacing.ts`
- Create: `packages/tokens/src/scales/sizes.ts`
- Create: `packages/tokens/src/scales/radius.ts`
- Create: `packages/tokens/src/scales/typography.ts`
- Create: `packages/tokens/scripts/emit-utilities.ts`

- [ ] **Step 1: Create scale definitions**

Create `packages/tokens/src/scales/spacing.ts`:

```ts
export const spacingScale = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80] as const;
export type SpacingValue = (typeof spacingScale)[number];
```

Create `packages/tokens/src/scales/sizes.ts`:

```ts
export const sizeScale = [24, 32, 40, 48] as const;
export type SizeValue = (typeof sizeScale)[number];
```

Create `packages/tokens/src/scales/radius.ts`:

```ts
export const radiusScale = [4, 6, 8, 12] as const;
export type RadiusValue = (typeof radiusScale)[number];
```

Create `packages/tokens/src/scales/typography.ts`:

```ts
export interface TypographyCombo {
  fontSize: number;
  lineHeight: number;
  weight: "regular" | "medium" | "bold";
  cssWeight: number;
}

export const typographyScale: TypographyCombo[] = [
  { fontSize: 12, lineHeight: 16, weight: "regular", cssWeight: 400 },
  { fontSize: 14, lineHeight: 20, weight: "regular", cssWeight: 400 },
  { fontSize: 14, lineHeight: 20, weight: "medium", cssWeight: 500 },
  { fontSize: 16, lineHeight: 20, weight: "regular", cssWeight: 400 },
  { fontSize: 16, lineHeight: 24, weight: "regular", cssWeight: 400 },
  { fontSize: 16, lineHeight: 24, weight: "medium", cssWeight: 500 },
  { fontSize: 20, lineHeight: 28, weight: "medium", cssWeight: 500 },
  { fontSize: 24, lineHeight: 32, weight: "medium", cssWeight: 500 },
  { fontSize: 32, lineHeight: 40, weight: "medium", cssWeight: 500 },
];
```

- [ ] **Step 2: Implement emit-utilities.ts**

Create `packages/tokens/scripts/emit-utilities.ts`:

```ts
import { spacingScale } from "../src/scales/spacing.js";
import { sizeScale } from "../src/scales/sizes.js";
import { radiusScale } from "../src/scales/radius.js";
import { typographyScale } from "../src/scales/typography.js";

function pxToRem(px: number): string {
  return px === 0 ? "0" : `${px / 16}rem`;
}

export function emitScaleVarsCSS(): string {
  const lines: string[] = [];

  for (const px of spacingScale) {
    lines.push(`  --ds-space-${px}: ${pxToRem(px)};`);
  }
  for (const px of sizeScale) {
    lines.push(`  --ds-size-${px}: ${pxToRem(px)};`);
  }
  for (const px of radiusScale) {
    lines.push(`  --ds-radius-${px}: ${pxToRem(px)};`);
  }
  lines.push(`  --ds-radius-full: 9999px;`);

  for (const t of typographyScale) {
    const name = `--ds-text-${t.fontSize}-${t.lineHeight}-${t.weight}`;
    lines.push(`  ${name}: ${t.cssWeight} ${pxToRem(t.fontSize)}/${pxToRem(t.lineHeight)} var(--ds-font-sans, system-ui, sans-serif);`);
  }

  lines.push(`  --ds-font-sans: system-ui, -apple-system, sans-serif;`);
  lines.push(`  --ds-font-mono: ui-monospace, "SF Mono", monospace;`);

  return lines.join("\n");
}

export function emitUtilitiesCSS(): string {
  const rules: string[] = [];

  for (const px of spacingScale) {
    rules.push(`.ds-gap-${px} { gap: var(--ds-space-${px}); }`);
    rules.push(`.ds-p-${px} { padding: var(--ds-space-${px}); }`);
    rules.push(`.ds-px-${px} { padding-inline: var(--ds-space-${px}); }`);
    rules.push(`.ds-py-${px} { padding-block: var(--ds-space-${px}); }`);
    rules.push(`.ds-m-${px} { margin: var(--ds-space-${px}); }`);
    rules.push(`.ds-mx-${px} { margin-inline: var(--ds-space-${px}); }`);
    rules.push(`.ds-my-${px} { margin-block: var(--ds-space-${px}); }`);
  }

  for (const t of typographyScale) {
    const cls = `ds-text-${t.fontSize}-${t.lineHeight}-${t.weight}`;
    rules.push(`.${cls} { font: var(--ds-text-${t.fontSize}-${t.lineHeight}-${t.weight}); }`);
  }

  return `@layer ds.utilities {\n${rules.map((r) => `  ${r}`).join("\n")}\n}\n`;
}
```

- [ ] **Step 3: Integrate scales into build.ts**

Add to `packages/tokens/scripts/build.ts`:

```ts
import { emitScaleVarsCSS, emitUtilitiesCSS } from "./emit-utilities.js";

// After emitting base.css, append scale vars to it:
const baseCSSWithScales = emitBaseCSS(defaultPalette).replace(
  "  }\n}\n",
  `${emitScaleVarsCSS()}\n  }\n}\n`
);
writeFileSync(pathResolve(dist, "base.css"), baseCSSWithScales);
writeFileSync(pathResolve(dist, "utilities.css"), emitUtilitiesCSS());
```

- [ ] **Step 4: Rebuild and verify**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm --filter @handamade/tokens build && head -30 packages/tokens/dist/base.css && head -10 packages/tokens/dist/utilities.css`
Expected: base.css contains `--ds-space-*`, `--ds-size-*`, `--ds-text-*`; utilities.css contains `ds-gap-*` classes

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/src/scales/ packages/tokens/scripts/emit-utilities.ts packages/tokens/scripts/build.ts
git commit -m "feat(tokens): scales (spacing, sizes, radius, typography) + utility CSS generation"
```

---

## M4: Storybook (Tasks 10–11)

### Task 10: Storybook scaffold + theme decorator

**Files:**
- Create: `apps/storybook/package.json`
- Create: `apps/storybook/.storybook/main.ts`
- Create: `apps/storybook/.storybook/preview.ts`
- Create: `apps/storybook/src/welcome/Welcome.stories.tsx`

- [ ] **Step 1: Create apps/storybook/package.json**

```json
{
  "name": "storybook",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "storybook dev -p 6006",
    "build": "storybook build"
  },
  "dependencies": {
    "@handamade/tokens": "workspace:*",
    "@handamade/react": "workspace:*",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "storybook": "^9.0.0",
    "@storybook/react-vite": "^9.0.0",
    "@storybook/addon-a11y": "^9.0.0",
    "@storybook/test": "^9.0.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create .storybook/main.ts**

```ts
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [
    "../src/**/*.stories.tsx",
    "../../../packages/react/src/**/*.stories.tsx",
  ],
  addons: ["@storybook/addon-a11y"],
  framework: "@storybook/react-vite",
};

export default config;
```

- [ ] **Step 3: Create .storybook/preview.ts**

```ts
import type { Preview } from "@storybook/react-vite";
import "@handamade/tokens/base.css";
import "@handamade/tokens/light.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "DS theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || "light";
      return (
        <div data-ds-theme={theme} style={{ padding: "1rem" }}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
```

- [ ] **Step 4: Create Welcome story**

Create `apps/storybook/src/welcome/Welcome.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";

function Welcome() {
  return (
    <div>
      <h1 className="ds-text-32-40-medium">DS Design System</h1>
      <p className="ds-text-16-24-regular">
        OKLCH-based tokens, pixel-true scales, component-level theming.
      </p>
    </div>
  );
}

const meta: Meta<typeof Welcome> = {
  title: "Welcome",
  component: Welcome,
};

export default meta;
type Story = StoryObj<typeof Welcome>;

export const Default: Story = {};
```

- [ ] **Step 5: Install and verify Storybook starts**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm install && pnpm --filter @handamade/tokens build && cd apps/storybook && pnpm storybook dev -p 6006`
Expected: Storybook opens at localhost:6006 with Welcome story

- [ ] **Step 6: Commit**

```bash
git add apps/storybook/
git commit -m "feat(storybook): scaffold with theme-switcher decorator + welcome story"
```

---

### Task 11: Generated token doc pages

**Files:**
- Create: `apps/storybook/src/token-docs/token-reader.ts`
- Create: `apps/storybook/src/token-docs/ColorTokens.stories.tsx`
- Create: `apps/storybook/src/token-docs/SpacingTokens.stories.tsx`
- Create: `apps/storybook/src/token-docs/TypographyTokens.stories.tsx`

- [ ] **Step 1: Create token-reader.ts**

```ts
import lightData from "@handamade/tokens/resolved/light.json";
import type { ResolvedToken } from "@handamade/tokens/types";

export interface TokenDoc {
  name: string;
  cssVar: string;
  hex: string;
  formula: string;
  oklch: { l: number; c: number; h: number; alpha?: number };
}

function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function getTokenDocs(theme: "light" | "dark" = "light"): TokenDoc[] {
  const data = theme === "light" ? lightData : lightData;
  return (data.tokens as ResolvedToken[]).map((t) => ({
    name: t.name,
    cssVar: `--ds-${camelToKebab(t.name)}`,
    hex: t.hex,
    formula: t.formula,
    oklch: t.oklch,
  }));
}
```

- [ ] **Step 2: Create ColorTokens story**

Create `apps/storybook/src/token-docs/ColorTokens.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { getTokenDocs } from "./token-reader.js";

function ColorTokens() {
  const tokens = getTokenDocs();
  const groups = {
    Backgrounds: tokens.filter((t) => t.name.startsWith("bg")),
    Foregrounds: tokens.filter((t) => t.name.startsWith("fg")),
    Fills: tokens.filter((t) => t.name.startsWith("fill")),
    Borders: tokens.filter((t) => t.name.startsWith("border")),
  };

  return (
    <div>
      {Object.entries(groups).map(([group, items]) => (
        <section key={group}>
          <h2 className="ds-text-24-32-medium">{group}</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px" }}>Color</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Name</th>
                <th style={{ textAlign: "left", padding: "8px" }}>
                  Reference → Mod
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.name}>
                  <td style={{ padding: "8px" }}>
                    <div
                      style={{
                        width: 48,
                        height: 32,
                        borderRadius: 4,
                        backgroundColor: t.hex,
                        border: "1px solid #0002",
                      }}
                    />
                  </td>
                  <td style={{ padding: "8px", fontFamily: "monospace" }}>
                    {t.cssVar}
                  </td>
                  <td style={{ padding: "8px" }}>{t.formula}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

const meta: Meta<typeof ColorTokens> = {
  title: "Tokens and Assets/Color Tokens",
  component: ColorTokens,
};

export default meta;
type Story = StoryObj<typeof ColorTokens>;
export const Default: Story = {};
```

- [ ] **Step 3: Create SpacingTokens and TypographyTokens stories**

Create `apps/storybook/src/token-docs/SpacingTokens.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { spacingScale } from "@handamade/tokens/scales/spacing";

function SpacingTokens() {
  return (
    <div>
      <h2 className="ds-text-24-32-medium">Spacing</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {spacingScale.map((px) => (
          <div key={px} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <code style={{ width: 140 }}>--ds-space-{px}</code>
            <div
              style={{
                width: `${px}px`,
                height: 24,
                backgroundColor: "var(--ds-fg-accent)",
                borderRadius: 2,
              }}
            />
            <span>{px === 0 ? "0" : `${px / 16}rem (${px}px)`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof SpacingTokens> = {
  title: "Tokens and Assets/Spacing",
  component: SpacingTokens,
};
export default meta;
type Story = StoryObj<typeof SpacingTokens>;
export const Default: Story = {};
```

Create `apps/storybook/src/token-docs/TypographyTokens.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { typographyScale } from "@handamade/tokens/scales/typography";

function TypographyTokens() {
  return (
    <div>
      <h2 className="ds-text-24-32-medium">Typography</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {typographyScale.map((t) => {
          const name = `ds-text-${t.fontSize}-${t.lineHeight}-${t.weight}`;
          return (
            <div key={name}>
              <code style={{ fontSize: 12 }}>--{name}</code>
              <p className={name} style={{ margin: "4px 0 0" }}>
                The quick brown fox jumps over the lazy dog
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const meta: Meta<typeof TypographyTokens> = {
  title: "Tokens and Assets/Typography",
  component: TypographyTokens,
};
export default meta;
type Story = StoryObj<typeof TypographyTokens>;
export const Default: Story = {};
```

- [ ] **Step 4: Verify stories render in Storybook**

Run Storybook and confirm Color Tokens, Spacing, and Typography pages render tables matching the screenshot's format (swatch + name + formula).

- [ ] **Step 5: Commit**

```bash
git add apps/storybook/src/token-docs/
git commit -m "feat(storybook): generated token doc pages — colors, spacing, typography"
```

---

## M5: Button + IconButton (Tasks 12–14)

### Task 12: Button component token definitions

**Files:**
- Create: `packages/tokens/src/components/button.ts`

- [ ] **Step 1: Write failing test**

Create `packages/tokens/__tests__/component-tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buttonTokens } from "../src/components/button.js";

describe("button component tokens", () => {
  it("defines accent variant tokens", () => {
    expect(buttonTokens).toHaveProperty("accent");
    expect(buttonTokens.accent).toHaveProperty("bg");
    expect(buttonTokens.accent).toHaveProperty("bgHover");
    expect(buttonTokens.accent).toHaveProperty("fg");
  });

  it("defines neutral and danger variants", () => {
    expect(buttonTokens).toHaveProperty("neutral");
    expect(buttonTokens).toHaveProperty("danger");
  });

  it("each variant has bg, bgHover, bgActive, fg, bgDisabled, fgDisabled", () => {
    for (const variant of Object.values(buttonTokens)) {
      expect(variant).toHaveProperty("bg");
      expect(variant).toHaveProperty("bgHover");
      expect(variant).toHaveProperty("bgActive");
      expect(variant).toHaveProperty("fg");
    }
  });
});
```

- [ ] **Step 2: Implement button component tokens**

Create `packages/tokens/src/components/button.ts`:

```ts
export interface VariantTokens {
  bg: string;
  bgHover: string;
  bgActive: string;
  fg: string;
}

export const buttonTokens: Record<string, VariantTokens> = {
  accent: {
    bg: "var(--ds-fill-accent)",
    bgHover: "oklch(from var(--ds-button-accent-bg, var(--ds-fill-accent)) calc(l - 0.04) c h)",
    bgActive: "oklch(from var(--ds-button-accent-bg, var(--ds-fill-accent)) calc(l - 0.08) c h)",
    fg: "var(--ds-fg-static-white)",
  },
  "accent-subtle": {
    bg: "var(--ds-fill-tint-accent)",
    bgHover: "oklch(from var(--ds-button-accent-subtle-bg, var(--ds-fill-tint-accent)) l c h / 0.2)",
    bgActive: "oklch(from var(--ds-button-accent-subtle-bg, var(--ds-fill-tint-accent)) l c h / 0.28)",
    fg: "var(--ds-fg-accent)",
  },
  neutral: {
    bg: "var(--ds-fill-neutral-3)",
    bgHover: "var(--ds-fill-neutral-4)",
    bgActive: "var(--ds-fill-neutral-5)",
    fg: "var(--ds-fg-primary)",
  },
  "neutral-subtle": {
    bg: "transparent",
    bgHover: "var(--ds-fill-neutral-3)",
    bgActive: "var(--ds-fill-neutral-4)",
    fg: "var(--ds-fg-primary)",
  },
  ghost: {
    bg: "transparent",
    bgHover: "var(--ds-fill-neutral-3)",
    bgActive: "var(--ds-fill-neutral-4)",
    fg: "var(--ds-fg-secondary)",
  },
  danger: {
    bg: "var(--ds-fill-danger)",
    bgHover: "oklch(from var(--ds-button-danger-bg, var(--ds-fill-danger)) calc(l - 0.04) c h)",
    bgActive: "oklch(from var(--ds-button-danger-bg, var(--ds-fill-danger)) calc(l - 0.08) c h)",
    fg: "var(--ds-fg-static-white)",
  },
  "danger-subtle": {
    bg: "var(--ds-fill-tint-danger)",
    bgHover: "oklch(from var(--ds-button-danger-subtle-bg, var(--ds-fill-tint-danger)) l c h / 0.2)",
    bgActive: "oklch(from var(--ds-button-danger-subtle-bg, var(--ds-fill-tint-danger)) l c h / 0.28)",
    fg: "var(--ds-fg-danger)",
  },
};
```

- [ ] **Step 3: Run test and verify**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm vitest run packages/tokens/__tests__/component-tokens.test.ts`
Expected: PASS

- [ ] **Step 4: Wire into codegen — emit component CSS**

Add to `packages/tokens/scripts/build.ts` a component CSS emitter that writes `dist/components/button.vars.css` wrapping each variant's tokens in a `@layer ds.components` block.

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/src/components/button.ts packages/tokens/__tests__/component-tokens.test.ts packages/tokens/scripts/build.ts
git commit -m "feat(tokens): button component token definitions with derived hover/active states"
```

---

### Task 13: Button React component

**Files:**
- Create: `packages/react/src/Button/Button.tsx`
- Create: `packages/react/src/Button/button.module.css`
- Create: `packages/react/src/Button/Button.test.tsx`
- Create: `packages/react/src/Button/Button.stories.tsx`
- Create: `packages/react/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `packages/react/src/Button/Button.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button.js";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeTruthy();
  });

  it("applies variant class", () => {
    render(<Button variant="accent">Go</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("accent");
  });

  it("applies size class", () => {
    render(<Button size={40}>Go</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("40");
  });

  it("handles click", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("supports disabled", () => {
    render(<Button disabled>Go</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("forwards ref", () => {
    let ref: HTMLButtonElement | null = null;
    render(<Button ref={(el) => { ref = el; }}>Go</Button>);
    expect(ref).toBeInstanceOf(HTMLButtonElement);
  });
});
```

- [ ] **Step 2: Implement Button.tsx**

Create `packages/react/src/Button/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from "react";
import styles from "./button.module.css";

type Variant =
  | "accent"
  | "accent-subtle"
  | "neutral"
  | "neutral-subtle"
  | "ghost"
  | "danger"
  | "danger-subtle";

type Size = 24 | 32 | 40 | 48;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  variant = "neutral",
  size = 32,
  className,
  ref,
  ...props
}: ButtonProps) {
  const variantClass = styles[variant] || "";
  const sizeClass = styles[`size-${size}`] || "";

  return (
    <button
      ref={ref}
      className={`${styles.button} ${variantClass} ${sizeClass} ${className || ""}`.trim()}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Create button.module.css**

Create `packages/react/src/Button/button.module.css`:

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ds-space-6);
  border: none;
  border-radius: var(--ds-radius-8);
  cursor: pointer;
  font: var(--ds-text-14-20-medium);
  transition: background-color 120ms ease;
  padding-inline: var(--ds-space-12);
}

.button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.button:focus-visible {
  outline: 2px solid var(--ds-border-focus);
  outline-offset: 2px;
}

.size-24 { height: var(--ds-size-24); font: var(--ds-text-12-16-regular); padding-inline: var(--ds-space-8); }
.size-32 { height: var(--ds-size-32); }
.size-40 { height: var(--ds-size-40); font: var(--ds-text-16-20-regular); }
.size-48 { height: var(--ds-size-48); font: var(--ds-text-16-24-medium); padding-inline: var(--ds-space-16); }

.accent {
  background: var(--ds-button-accent-bg, var(--ds-fill-accent));
  color: var(--ds-fg-static-white);
}
.accent:hover:not(:disabled) {
  background: oklch(from var(--ds-button-accent-bg, var(--ds-fill-accent)) calc(l - 0.04) c h);
}
.accent:active:not(:disabled) {
  background: oklch(from var(--ds-button-accent-bg, var(--ds-fill-accent)) calc(l - 0.08) c h);
}

.accent-subtle {
  background: var(--ds-fill-tint-accent);
  color: var(--ds-fg-accent);
}
.accent-subtle:hover:not(:disabled) { background: oklch(from var(--ds-fg-accent) l c h / 0.2); }
.accent-subtle:active:not(:disabled) { background: oklch(from var(--ds-fg-accent) l c h / 0.28); }

.neutral {
  background: var(--ds-fill-neutral-3);
  color: var(--ds-fg-primary);
}
.neutral:hover:not(:disabled) { background: var(--ds-fill-neutral-4); }
.neutral:active:not(:disabled) { background: var(--ds-fill-neutral-5); }

.neutral-subtle {
  background: transparent;
  color: var(--ds-fg-primary);
}
.neutral-subtle:hover:not(:disabled) { background: var(--ds-fill-neutral-3); }
.neutral-subtle:active:not(:disabled) { background: var(--ds-fill-neutral-4); }

.ghost {
  background: transparent;
  color: var(--ds-fg-secondary);
}
.ghost:hover:not(:disabled) { background: var(--ds-fill-neutral-3); }
.ghost:active:not(:disabled) { background: var(--ds-fill-neutral-4); }

.danger {
  background: var(--ds-fill-danger);
  color: var(--ds-fg-static-white);
}
.danger:hover:not(:disabled) {
  background: oklch(from var(--ds-button-danger-bg, var(--ds-fill-danger)) calc(l - 0.04) c h);
}
.danger:active:not(:disabled) {
  background: oklch(from var(--ds-button-danger-bg, var(--ds-fill-danger)) calc(l - 0.08) c h);
}

.danger-subtle {
  background: var(--ds-fill-tint-danger);
  color: var(--ds-fg-danger);
}
.danger-subtle:hover:not(:disabled) { background: oklch(from var(--ds-fg-danger) l c h / 0.2); }
.danger-subtle:active:not(:disabled) { background: oklch(from var(--ds-fg-danger) l c h / 0.28); }
```

- [ ] **Step 4: Create barrel export**

Create `packages/react/src/index.ts`:

```ts
export { Button } from "./Button/Button.js";
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm vitest run packages/react/src/Button/Button.test.tsx`
Expected: PASS — all 6 tests

- [ ] **Step 6: Create Button.stories.tsx**

Create `packages/react/src/Button/Button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button.js";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["accent", "accent-subtle", "neutral", "neutral-subtle", "ghost", "danger", "danger-subtle"],
    },
    size: { control: "select", options: [24, 32, 40, 48] },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Accent: Story = { args: { variant: "accent", children: "Submit" } };
export const AccentSubtle: Story = { args: { variant: "accent-subtle", children: "Filter" } };
export const Neutral: Story = { args: { variant: "neutral", children: "Cancel" } };
export const Ghost: Story = { args: { variant: "ghost", children: "More" } };
export const Danger: Story = { args: { variant: "danger", children: "Delete" } };
export const Disabled: Story = { args: { variant: "accent", children: "Submit", disabled: true } };

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <Button variant="accent" size={24}>24</Button>
      <Button variant="accent" size={32}>32</Button>
      <Button variant="accent" size={40}>40</Button>
      <Button variant="accent" size={48}>48</Button>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {(["accent", "accent-subtle", "neutral", "neutral-subtle", "ghost", "danger", "danger-subtle"] as const).map(
        (v) => <Button key={v} variant={v}>{v}</Button>
      )}
    </div>
  ),
};
```

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/Button/ packages/react/src/index.ts
git commit -m "feat(react): Button component — 7 variants, 4 sizes, CSS Modules, derived states"
```

---

### Task 14: IconButton component

**Files:**
- Create: `packages/react/src/IconButton/IconButton.tsx`
- Create: `packages/react/src/IconButton/icon-button.module.css`
- Create: `packages/react/src/IconButton/IconButton.test.tsx`
- Create: `packages/react/src/IconButton/IconButton.stories.tsx`

- [ ] **Step 1: Write failing test**

Create `packages/react/src/IconButton/IconButton.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { IconButton } from "./IconButton.js";

describe("IconButton", () => {
  it("renders with aria-label", () => {
    render(<IconButton aria-label="Close">X</IconButton>);
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });

  it("applies size", () => {
    render(<IconButton aria-label="Close" size={40}>X</IconButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("40");
  });
});
```

- [ ] **Step 2: Implement IconButton**

Create `packages/react/src/IconButton/IconButton.tsx`:

```tsx
import type { ButtonHTMLAttributes } from "react";
import styles from "./icon-button.module.css";

type Variant = "accent" | "neutral" | "ghost" | "danger";
type Size = 24 | 32 | 40 | 48;

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  ref?: React.Ref<HTMLButtonElement>;
}

export function IconButton({
  variant = "ghost",
  size = 32,
  className,
  ref,
  ...props
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      className={`${styles.iconButton} ${styles[variant]} ${styles[`size-${size}`]} ${className || ""}`.trim()}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Create icon-button.module.css**

Create `packages/react/src/IconButton/icon-button.module.css`:

```css
.iconButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--ds-radius-8);
  cursor: pointer;
  padding: 0;
  transition: background-color 120ms ease;
}

.iconButton:disabled { opacity: 0.4; cursor: not-allowed; }
.iconButton:focus-visible { outline: 2px solid var(--ds-border-focus); outline-offset: 2px; }

.size-24 { width: var(--ds-size-24); height: var(--ds-size-24); font-size: 14px; }
.size-32 { width: var(--ds-size-32); height: var(--ds-size-32); font-size: 16px; }
.size-40 { width: var(--ds-size-40); height: var(--ds-size-40); font-size: 20px; }
.size-48 { width: var(--ds-size-48); height: var(--ds-size-48); font-size: 24px; }

.ghost { background: transparent; color: var(--ds-fg-secondary); }
.ghost:hover:not(:disabled) { background: var(--ds-fill-neutral-3); }

.neutral { background: var(--ds-fill-neutral-3); color: var(--ds-fg-primary); }
.neutral:hover:not(:disabled) { background: var(--ds-fill-neutral-4); }

.accent { background: var(--ds-fill-accent); color: var(--ds-fg-static-white); }
.accent:hover:not(:disabled) { background: oklch(from var(--ds-fill-accent) calc(l - 0.04) c h); }

.danger { background: var(--ds-fill-danger); color: var(--ds-fg-static-white); }
.danger:hover:not(:disabled) { background: oklch(from var(--ds-fill-danger) calc(l - 0.04) c h); }
```

- [ ] **Step 4: Run tests, add stories, export, commit**

Run tests, create `IconButton.stories.tsx` with size/variant matrix, add to `index.ts`, commit:

```bash
git add packages/react/src/IconButton/ packages/react/src/index.ts
git commit -m "feat(react): IconButton component — 4 variants, 4 sizes"
```

---

## M6: Remaining 6 Components + Icons (Tasks 15–20)

### Task 15: Input component

**Files:** `packages/react/src/Input/Input.tsx`, `input.module.css`, `Input.test.tsx`, `Input.stories.tsx`

- [ ] **Step 1: Write failing test** — renders `<input>`, accepts `size` prop (24/32/40/48), applies focus ring via `--ds-border-focus`, supports disabled and error states
- [ ] **Step 2: Implement Input.tsx** — wraps native `<input>`, height from `--ds-size-{n}`, border from `--ds-border-neutral`, focus ring from `--ds-border-focus`, error state uses `--ds-fg-danger` border
- [ ] **Step 3: Create input.module.css** — sizes, states, derived hover border
- [ ] **Step 4: Stories** — sizes, states (default, focused, error, disabled), with labels
- [ ] **Step 5: Run tests, add to index.ts, commit**

### Task 16: Select component (styled native)

**Files:** `packages/react/src/Select/Select.tsx`, `select.module.css`, `Select.test.tsx`, `Select.stories.tsx`

- [ ] **Step 1: Write failing test** — renders `<select>`, size prop, disabled
- [ ] **Step 2: Implement** — styled native `<select>` with custom chevron via CSS, height from `--ds-size-{n}`, same border/focus pattern as Input
- [ ] **Step 3: Stories** — sizes, states, with options
- [ ] **Step 4: Run tests, export, commit**

### Task 17: Checkbox + Switch

**Files:** `Checkbox/`, `Switch/`

- [ ] **Step 1: Checkbox** — real `<input type="checkbox">` with visually-custom check mark, sized by scale tokens, accent variant colors the checked state
- [ ] **Step 2: Switch** — real `<input type="checkbox" role="switch">` with sliding track, accent variant for on state
- [ ] **Step 3: Tests** — toggling, keyboard (Space), disabled, aria-checked
- [ ] **Step 4: Stories, export, commit**

### Task 18: Tag/Badge component

**Files:** `packages/react/src/Tag/Tag.tsx`, `tag.module.css`, `Tag.test.tsx`, `Tag.stories.tsx`

- [ ] **Step 1: Write failing test** — renders with variant, shows dismissible X when `onDismiss` provided
- [ ] **Step 2: Implement** — variants: `neutral | accent | success | warning | danger`, each with `-subtle` form where bg derives from matching fg token via alpha. Size 24 only (compact element).
- [ ] **Step 3: Stories** — all variants, subtle variants, dismissible
- [ ] **Step 4: Run tests, export, commit**

### Task 19: Tooltip component

**Files:** `packages/react/src/Tooltip/Tooltip.tsx`, `tooltip.module.css`, `Tooltip.test.tsx`, `Tooltip.stories.tsx`

- [ ] **Step 1: Write failing test** — shows content on hover/focus, hides on blur, accessible via aria-describedby
- [ ] **Step 2: Implement** — uses native popover API + small positioning util (no Floating UI); trigger wraps children, tooltip positioned with anchor positioning CSS or JS fallback
- [ ] **Step 3: Stories** — positions (top/bottom/left/right), on button, on text
- [ ] **Step 4: Run tests, export, commit**

### Task 20: Icon components

**Files:** `packages/react/src/icons/*.tsx`, `packages/react/src/icons/index.ts`

- [ ] **Step 1: Create ~16 icon components** — each is a named export, renders `<svg>` with `currentColor` fill, accepts size prop, forwards ref. Icons: `IconPlus`, `IconMinus`, `IconClose`, `IconCheck`, `IconChevronDown`, `IconChevronRight`, `IconSearch`, `IconSettings`, `IconUser`, `IconEdit`, `IconTrash`, `IconCopy`, `IconExternalLink`, `IconEye`, `IconEyeOff`, `IconLoader`
- [ ] **Step 2: Test** — renders with aria-hidden by default, accessible label when provided
- [ ] **Step 3: Stories** — icon gallery showing all icons at sizes 16/20/24
- [ ] **Step 4: Export from icons/index.ts, add to main index.ts, commit**

---

## M7: Figma Plugin (Tasks 21–22)

### Task 21: Figma plugin scaffold

**Files:**
- Create: `packages/figma-plugin/package.json`
- Create: `packages/figma-plugin/manifest.json`
- Create: `packages/figma-plugin/src/ui.html`
- Create: `packages/figma-plugin/esbuild.config.ts`

- [ ] **Step 1: Create manifest.json**

```json
{
  "name": "DS Token Sync",
  "id": "ds-token-sync",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "editorType": ["figma"]
}
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@handamade/figma-plugin",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node esbuild.config.ts",
    "dev": "node esbuild.config.ts --watch"
  },
  "devDependencies": {
    "@figma/plugin-typings": "^1.100.0",
    "esbuild": "^0.24.0"
  }
}
```

- [ ] **Step 3: Create ui.html** — minimal UI with textarea to paste resolved JSON, dry-run checkbox, sync button
- [ ] **Step 4: Create esbuild config** — bundles src/code.ts to dist/code.js, copies ui.html
- [ ] **Step 5: Commit**

### Task 22: Plugin sync logic

**Files:**
- Create: `packages/figma-plugin/src/code.ts`

- [ ] **Step 1: Implement code.ts** — on message from UI:
  1. Parse the resolved JSON (array of `{name, oklch, hex, formula}`)
  2. Find or create variable collection "DS Tokens"
  3. Find or create mode for the theme name
  4. For each color token: find or create a color variable in the appropriate group (`bg/`, `fg/`, `fill/`, `border/`), set the resolved hex value, write formula into the variable description
  5. For each scale token (spacing, size, radius): find or create a number variable
  6. Report created/updated/orphaned counts back to UI
  7. In dry-run mode: compute diff but don't write

- [ ] **Step 2: Test manually** — build plugin, load in Figma dev mode, paste resolved/light.json, verify variables appear
- [ ] **Step 3: Commit**

```bash
git add packages/figma-plugin/
git commit -m "feat(figma-plugin): variable sync — upsert colors, scales, formula descriptions"
```

---

## M8: Customer Theming + Polish (Tasks 23–25)

### Task 23: Customer theme scaffolder

**Files:**
- Create: `packages/tokens/scripts/new-theme.ts`

- [ ] **Step 1: Implement new-theme.ts**

```ts
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const name = process.argv[2];
if (!name) {
  console.error("Usage: pnpm new-theme <name>");
  process.exit(1);
}

const dir = resolve(import.meta.dirname, "../src/themes/customers");
const file = resolve(dir, `${name}.ts`);

if (existsSync(file)) {
  console.error(`Theme "${name}" already exists at ${file}`);
  process.exit(1);
}

mkdirSync(dir, { recursive: true });

const template = `import type { Palette, SlotMap, ThemeDef } from "../../dsl/types.js";
import { token, set, delta, cap, slot, ref } from "../../dsl/builders.js";

export const ${name}Palette: Palette = {
  // Replace with brand OKLCH anchors
  dark: { l: 0.25, c: 0.02, h: 250 },
  light: { l: 0.95, c: 0.005, h: 250 },
  brand: { l: 0.55, c: 0.21, h: 260 },
  white: { l: 1.0, c: 0, h: 0 },
  black: { l: 0.0, c: 0, h: 0 },
};

export const ${name}Slots: SlotMap = {
  ink: "dark",
  canvas: "light",
  accent: "brand",
  success: "brand",
  warning: "brand",
  danger: "brand",
};

// Optional: override any semantic or component token formula
export const ${name}Overrides: Partial<ThemeDef> = {};
`;

writeFileSync(file, template);
console.log(`Created ${file}`);
console.log(`Next: edit the palette, then run "pnpm build" to generate ${name}.css`);
```

- [ ] **Step 2: Add script to package.json**

In `packages/tokens/package.json`:

```json
"scripts": {
  "new-theme": "tsx scripts/new-theme.ts"
}
```

- [ ] **Step 3: Test** — run `pnpm --filter @handamade/tokens new-theme acme`, verify file created
- [ ] **Step 4: Commit**

```bash
git add packages/tokens/scripts/new-theme.ts packages/tokens/package.json
git commit -m "feat(tokens): customer theme scaffolder — pnpm new-theme <name>"
```

---

### Task 24: Example customer theme (acme)

**Files:**
- Create: `packages/tokens/src/themes/customers/acme.ts`

- [ ] **Step 1: Scaffold and customize**

Run: `pnpm --filter @handamade/tokens new-theme acme`

Edit `packages/tokens/src/themes/customers/acme.ts` to use a warm brand palette:

```ts
export const acmePalette: Palette = {
  charcoal: { l: 0.22, c: 0.015, h: 30 },
  cream: { l: 0.96, c: 0.01, h: 80 },
  coral: { l: 0.65, c: 0.2, h: 30 },
  mint: { l: 0.7, c: 0.15, h: 160 },
  gold: { l: 0.78, c: 0.15, h: 85 },
  crimson: { l: 0.55, c: 0.22, h: 15 },
  white: { l: 1.0, c: 0, h: 0 },
  black: { l: 0.0, c: 0, h: 0 },
};

export const acmeSlots: SlotMap = {
  ink: "charcoal",
  canvas: "cream",
  accent: "coral",
  success: "mint",
  warning: "gold",
  danger: "crimson",
};
```

- [ ] **Step 2: Register in build.ts** — import acme palette/slots, create a light-based theme using acme's palette, add to themes map
- [ ] **Step 3: Build and verify** — `pnpm build` emits `dist/acme.css` and `dist/resolved/acme.json`
- [ ] **Step 4: Verify contrast matrix passes for acme**
- [ ] **Step 5: Add Storybook theme-switcher entry for acme**
- [ ] **Step 6: Commit**

```bash
git add packages/tokens/src/themes/customers/acme.ts packages/tokens/scripts/build.ts apps/storybook/
git commit -m "feat(tokens): acme example customer theme — warm coral brand palette"
```

---

### Task 25: Final polish + changesets setup

**Files:**
- Create: `.changeset/config.json`
- Modify: root `package.json`

- [ ] **Step 1: Initialize changesets**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm changeset init`

- [ ] **Step 2: Verify full test suite**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm test`
Expected: all tests pass

- [ ] **Step 3: Verify full build**

Run: `cd /Users/dmytrokurkin/Projects/dku/ds && pnpm build`
Expected: tokens dist/ populated, Storybook builds

- [ ] **Step 4: Add dark.css import to Storybook preview** — ensure the theme switcher loads dark theme CSS

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: changesets init, final polish, all milestones complete"
```
