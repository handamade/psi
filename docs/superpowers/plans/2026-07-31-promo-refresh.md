# Promo Page Refresh (0.8.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `apps/promo` level with the shipped packages (**0.8.1** — 0.8.1
released mid-flight, after this plan was written) — manifest-backed
counts, a live `--psi-control-radius` dial on the theme cards, a Menu card in
the playground, two curated update entries, and the theme console named on the
public roadmap.

**Architecture:** `apps/promo` is a Vite + React 19 consumer app of
`@handamade/psi-tokens` and `@handamade/psi-react`. Every change is local to
`apps/promo/src`; no package, token or component is touched. The one piece of
new behaviour is React state in two sections (`Theming` holds a radius rung
index, `Playground` holds Menu open state), both plain `useState`.

**Tech Stack:** React 19, TypeScript, Vite 6, CSS (hand-written
`promo.css`, not CSS Modules), `@handamade/psi-react` components.

**Spec:** `docs/superpowers/specs/2026-07-31-promo-refresh-design.md`

**Branch:** `docs/promo-refresh-0-8-0` (already created; spec committed at
`f21ea73`).

## Global Constraints

- **Node 24.** `.nvmrc` says `24`; pnpm 11.9 dies on Node 20 with
  `ERR_UNKNOWN_BUILTIN_MODULE`. Run `nvm use` in the shell **before the first
  pnpm command** and do not prefix individual commands with a PATH override.
- **No package changes.** Nothing under `packages/` is edited. If a task
  appears to need one, stop and report — that is a spec violation, not a
  judgement call.
- **No changeset.** `apps/promo` is private and unpublished.
- **Never hardcode colours.** Bind `var(--psi-*)`. The custom stylelint plugin
  runs over `apps/**/*.css` and will fail the build otherwise.
- **Sizes are px numbers** (`24 | 32 | 40 | 48`), never S/M/L.
- **Radius rungs are `4 | 6 | 8 | 12`** — the whole published scale
  (`packages/tokens/src/scales/radius.ts`). No off-scale values anywhere.
- **Component count is 18**, sourced from `packages/react/dist/manifest.json`.
  **Icon count stays 22**, theme count stays 4 — both already correct; do not
  "fix" them.
- **No new section.** The page keeps its eight sections and `01`–`06`
  numbering.

## Testing posture — read this before Task 1

**`apps/promo` has no test harness, by design.** `vitest.workspace.ts` covers
`packages/*` only; the promo app has no vitest, jsdom or testing-library in its
devDependencies. The approved spec's Verification section defines the contract
as typecheck + lint + build + explicit browser checks, and this plan follows it.

**This is a deliberate departure from the usual TDD cycle.** Do not add a test
harness to `apps/promo` as part of this work — that is unscoped infrastructure.
Instead, every task below ends with:

1. A **typecheck** that must pass, and
2. A **named browser check** with a stated expected observation.

Treat the browser check as the test. Do not tick a task's final checkbox on a
typecheck alone; several of these changes (the dial's cascade, the Menu's
dismissal wiring) typecheck perfectly while being visibly wrong.

## Standard commands

```bash
nvm use                                                    # once per shell
pnpm --dir apps/promo exec tsc -p tsconfig.json --noEmit    # typecheck
pnpm lint                                                   # eslint + stylelint
```

Dev server: use the **Browser pane**, not Bash. Task 0 adds a `promo-dev`
launch entry; start it with `preview_start {name: "promo-dev"}`. The existing
`promo` entry runs `vite preview` against `dist/` and needs a build first —
wrong for iterating.

## File Structure

| File | Change | Responsibility |
| ---- | ------ | -------------- |
| `.claude/launch.json` | Modify, **not committed** | `promo-dev` dev-server entry. `.claude/` is gitignored — machine-local by design |
| `apps/promo/src/sections/Hero.tsx` | Modify (line 5) | Stat strip count |
| `apps/promo/src/sections/Playground.tsx` | Modify | Counts, version chip, Menu card, index list |
| `apps/promo/src/sections/Theming.tsx` | Modify | Radius dial + `radius` prop on `ThemePreview` |
| `apps/promo/src/sections/Roadmap.tsx` | Modify | Counts, D53–D56 rows, theme console in "Next" |
| `apps/promo/src/content/updates.ts` | Modify | Two prepended entries |
| `apps/promo/src/promo.css` | Modify | `.shape-dial` block |

Task order is deliberate: **Task 2 (the dial) before Task 3 (Menu)**, because
the dial is the spec's substantive claim and the Menu card carries the only
real behavioural risk. Landing the dial first means a Menu problem cannot
block the refresh's headline change.

---

### Task 0: Dev-server entry

**Files:**
- Modify: `.claude/launch.json`

**Interfaces:**
- Produces: a launch config named `promo-dev` on port 5173, consumed by every
  later task's browser check.

- [ ] **Step 1: Add the entry**

Add this object to the `configurations` array in `.claude/launch.json`,
alongside the existing `promo` entry (leave that one alone):

```json
{
  "name": "promo-dev",
  "runtimeExecutable": "apps/promo/node_modules/.bin/vite",
  "runtimeArgs": ["apps/promo", "--port", "5173", "--strictPort"],
  "port": 5173
}
```

**It must not invoke `pnpm`.** `preview_start` spawns its server on **Node 20**,
and pnpm 11.9 dies there with `ERR_UNKNOWN_BUILTIN_MODULE` (it needs
`node:sqlite`) — a pnpm-based entry fails every time, which is what the first
attempt did. Vite itself is fine on Node 20 (verified: `vite/6.4.3
node-v20.20.2`), so calling its binary directly sidesteps pnpm entirely and
needs no Node pinning.

- [ ] **Step 2: Verify it starts**

Use the Browser pane: `preview_start {name: "promo-dev"}`.

Expected: the Psi promo page renders at `http://localhost:5173`. The hero
reads "Color isn't picked. It's computed."

If it fails with a missing `@handamade/psi-tokens` export, the tokens dist is
stale — run `nvm use && pnpm --dir packages/tokens build` once, then retry.

- [ ] **Step 3: Do NOT commit it**

`.claude/` is gitignored (`.gitignore`: "local Claude Code session config
(machine-specific launch.json etc.)"). `git add .claude/launch.json` would
fail, and the entry is deliberately machine-local — it must not be committed.
Leave it untracked and move on; `git status` should stay clean.

---

### Task 1: Honest counts and version strings

**Files:**
- Modify: `apps/promo/src/sections/Hero.tsx:5`
- Modify: `apps/promo/src/sections/Playground.tsx:41,56`
- Modify: `apps/promo/src/sections/Roadmap.tsx:4`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. Pure copy; no exported symbol changes.

- [ ] **Step 1: Confirm 18 is still the manifest's number**

```bash
node -e "const m=require('./packages/react/dist/manifest.json'); console.log(m.components.length, m.components.map(c=>c.name).join(' '))"
```

Expected output:

```
18 Button IconButton Card Panel Input Select Field Dialog Checkbox Switch Tag Toolbar Tooltip NavBar AspectRatio Menu MenuItem MenuSeparator
```

If it prints anything other than `18`, **stop and report** — the plan's
central number is wrong and the spec needs revisiting.

- [ ] **Step 2: Hero stat strip**

In `apps/promo/src/sections/Hero.tsx`, change line 5 only:

```tsx
const STATS = [
  "18 components",
  "22 icons",
  "4 themes",
  "0 runtime deps",
  "AA enforced at build",
];
```

Leave `"22 icons"` and `"4 themes"` exactly as they are — both verified
correct.

- [ ] **Step 3: Playground heading and version chip**

In `apps/promo/src/sections/Playground.tsx`, line 41:

```tsx
const INITIAL_FILTERS = ["psi-tokens", "0.8.1", "wcag-aa"] as const;
```

and line 56:

```tsx
          <h2>Eighteen production components. All live — try them.</h2>
```

Leave line 170 (`Panel + Toolbar · the 0.7 surface pair`) untouched — it is a
historical label and still accurate.

- [ ] **Step 4: Roadmap first row**

In `apps/promo/src/sections/Roadmap.tsx`, replace line 4:

```tsx
  ["18 components, 22 icons", "Button, IconButton, Input, Select, Checkbox, Switch, Tag, Tooltip, Card, Panel, NavBar, Toolbar, AspectRatio, Field, Dialog, Menu, MenuItem, MenuSeparator"],
```

- [ ] **Step 5: Typecheck**

```bash
pnpm --dir apps/promo exec tsc -p tsconfig.json --noEmit
```

Expected: no output, exit 0.

- [ ] **Step 6: Browser check**

Reload `http://localhost:5173`.

Expected: hero strip reads "18 components · 22 icons · 4 themes · 0 runtime
deps · AA enforced at build"; the Components heading reads "Eighteen
production components."; the Toolbar card's third filter chip reads `0.8.1`.

- [ ] **Step 7: Commit**

```bash
git add apps/promo/src/sections/Hero.tsx apps/promo/src/sections/Playground.tsx apps/promo/src/sections/Roadmap.tsx
git commit -m "docs(promo): counts track the manifest (15 -> 18)

Menu shipped as three separately-propped manifest entries. Icon count
(22) and theme count (4) were already correct and are unchanged.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The control-radius dial

**Files:**
- Modify: `apps/promo/src/sections/Theming.tsx`
- Modify: `apps/promo/src/promo.css` (append after the `.derive-controls`
  block, currently ending line 336)

**Interfaces:**
- Consumes: `ThemeName` from `../theme` (unchanged).
- Produces: `ThemePreview` gains a required `radius: number` prop. It is
  module-local — not exported — so no other file is affected.

**The one thing that will silently break this:** `--psi-control-radius` is
emitted in `components.css` under `:where(:root, [data-psi-theme])`. Every
`.theme-card-ui` carries `data-psi-theme`, so **each card re-declares the
default on itself**. A value set on any ancestor is overridden by the card.
The inline style must land on the *same element* as `data-psi-theme`, where it
wins outright (`:where()` has zero specificity). Do not "tidy" it onto the
wrapper.

- [ ] **Step 1: Rewrite `Theming.tsx`**

Replace the whole file with:

```tsx
import { useState, type CSSProperties } from "react";
import { Button, IconCheck, Switch, Tag } from "@handamade/psi-react";

import type { ThemeName } from "../theme";

const ACME_SNIPPET = `export const acmePalette: Palette = {
  charcoal: { l: 0.22, c: 0.015, h: 30 },
  cream:    { l: 0.96, c: 0.01,  h: 80 },
  coral:    { l: 0.55, c: 0.2,   h: 30 },
  mint:     { l: 0.52, c: 0.15,  h: 160 },
  gold:     { l: 0.78, c: 0.15,  h: 85 },
  crimson:  { l: 0.55, c: 0.22,  h: 15 },
};

export const acmeSlots: SlotMap = {
  ink: "charcoal",   canvas: "cream",
  accent: "coral",   success: "mint",
  warning: "gold",   danger: "crimson",
};`;

/** The published radius scale — packages/tokens/src/scales/radius.ts.
 *  The dial steps rungs, never free pixels: a theme sets a rung. */
const RADIUS_RUNGS = [4, 6, 8, 12] as const;
const DEFAULT_RUNG = 2; // radius-8, the --psi-control-radius default

function ThemePreview({ name, radius }: { name: ThemeName; radius: number }) {
  return (
    <figure className="theme-card">
      {/* The inline custom property MUST sit on this element, not a wrapper:
          components.css declares --psi-control-radius under
          :where(:root, [data-psi-theme]), so this node re-declares the
          default on itself and would override anything inherited. */}
      <div
        className="theme-card-ui"
        data-psi-theme={name}
        style={
          { "--psi-control-radius": `var(--psi-radius-${radius})` } as CSSProperties
        }
      >
        <header>
          <strong>Invoices</strong>
          <Tag variant="success" subtle>
            Paid
          </Tag>
        </header>
        <p>Q3 retainer — Acme Corp. Due in 14 days.</p>
        <div className="row">
          <Switch defaultChecked>Auto-remind</Switch>
          <Button variant="accent">New invoice</Button>
        </div>
      </div>
      <figcaption className="annot">
        data-psi-theme=&quot;{name}&quot; · --psi-control-radius: radius-
        {radius}
      </figcaption>
    </figure>
  );
}

export function Theming() {
  // Annotated: DEFAULT_RUNG has the literal type 2, and an explicit <number>
  // keeps setRung from narrowing to it.
  const [rung, setRung] = useState<number>(DEFAULT_RUNG);
  const radius = RADIUS_RUNGS[rung];

  return (
    <section className="section" id="theming">
      <div className="container">
        <div className="section-head">
          <span className="annot annot--accent">03 · Theming</span>
          <h2>A customer is a theme file, not a fork.</h2>
          <p className="lede">
            The same markup, rendered three times below — each card just sets
            its own <code>data-psi-theme</code>. Semantic token names never
            change, so consuming code is theme-agnostic.
          </p>
        </div>

        <div className="shape-dial">
          <span className="annot">
            <code>--psi-control-radius</code>
          </span>
          <input
            type="range"
            min={0}
            max={RADIUS_RUNGS.length - 1}
            step={1}
            value={rung}
            aria-label="Control radius"
            onChange={(event) => setRung(Number(event.target.value))}
          />
          <output className="annot annot--accent">radius-{radius}</output>
        </div>

        <div className="theme-grid">
          <ThemePreview name="light" radius={radius} />
          <ThemePreview name="dark" radius={radius} />
          <ThemePreview name="acme" radius={radius} />
        </div>

        <div className="theming-cols">
          <div className="code-block">
            <div className="code-block-head">
              <span className="annot">
                themes/customers/acme.ts · scaffolded by `pnpm new-theme acme`
              </span>
            </div>
            <pre>{ACME_SNIPPET}</pre>
          </div>
          <ul className="check-list">
            <li>
              <IconCheck size={16} aria-hidden="true" />
              <span>
                <strong>Six OKLCH anchors + six slots</strong> — that is the
                entire cost of onboarding a customer brand.
              </span>
            </li>
            <li>
              <IconCheck size={16} aria-hidden="true" />
              <span>
                <strong>…and one dial for shape.</strong> Drag it above:{" "}
                <code>
                  [data-psi-theme=&quot;acme&quot;] {"{"} --psi-control-radius:
                  var(--psi-radius-4); {"}"}
                </code>{" "}
                re-rounds every control at once. Tag and Switch stay pill on
                purpose — pill-ness is component identity, not theme
                expression.
              </span>
            </li>
            <li>
              <IconCheck size={16} aria-hidden="true" />
              <span>
                <strong>WCAG AA is a build gate, not a guideline.</strong> A
                theme that fails the contrast matrix fails the build.
              </span>
            </li>
            <li>
              <IconCheck size={16} aria-hidden="true" />
              <span>
                <strong>Themes are attribute-scoped</strong> — nest{" "}
                <code>data-psi-theme</code> anywhere for per-surface theming,
                like the three cards above.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add the dial's CSS**

In `apps/promo/src/promo.css`, immediately after the `.derive-controls
input[type="range"]` block (ends line 336), add:

```css
.shape-dial {
  display: flex;
  align-items: center;
  gap: var(--psi-space-12);
  margin-bottom: var(--psi-space-20);
  flex-wrap: wrap;
}

.shape-dial input[type="range"] {
  flex: 1;
  min-width: 160px;
  max-width: 320px;
  accent-color: var(--psi-fill-accent);
}
```

No colour literals — `accent-color` binds a token, matching
`.derive-controls`.

- [ ] **Step 3: Typecheck**

```bash
pnpm --dir apps/promo exec tsc -p tsconfig.json --noEmit
```

Expected: no output, exit 0.

- [ ] **Step 4: Lint (the stylelint plugin runs over `apps/**/*.css`)**

```bash
pnpm lint
```

Expected: no output, exit 0.

- [ ] **Step 5: Browser check — the cascade**

Reload and scroll to `03 · Theming`. Drag the dial across all four positions.

Expected at each stop:
- **All three cards** change together — the "New invoice" Button and the
  Switch's surrounding controls re-round in light, dark and acme at once.
- Each `figcaption` updates to match, e.g. `data-psi-theme="acme" ·
  --psi-control-radius: radius-4`.
- The **Tag** ("Paid") and the **Switch** stay fully pill at every rung.
- At `radius-4`, controls are visibly sharper than the cards containing them.
  **This is expected and in scope** — Card sits on no dial (spec, "Known
  carry"). Do not "fix" it.

If the cards do **not** change, the inline style has been moved off the
`data-psi-theme` node — re-read the comment in Step 1.

- [ ] **Step 6: Browser check — keyboard**

Tab to the dial and press Left/Right arrows.

Expected: the value steps one rung per press across `radius-4 … radius-12`,
the cards follow, and a visible focus ring appears on the input.

- [ ] **Step 7: Commit**

```bash
git add apps/promo/src/sections/Theming.tsx apps/promo/src/promo.css
git commit -m "docs(promo): live control-radius dial on the theme cards

D56 made control shape themeable; the Theming section still argued a
customer brand was colour alone. The dial steps the published rung scale
(4|6|8|12) and sets --psi-control-radius inline on each data-psi-theme
node -- components.css declares it under :where(:root, [data-psi-theme]),
so a value on a wrapper would be overridden by the cards themselves.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Menu card in the playground

**Files:**
- Modify: `apps/promo/src/sections/Playground.tsx`

**Interfaces:**
- Consumes: `Menu`, `MenuItem`, `MenuSeparator` from `@handamade/psi-react`.
  Exact signatures, from `dist/manifest.json`:
  - `Menu`: `open: boolean` (required), `onClose: (reason: "item-select" |
    "esc" | "outside") => void` (required), `trigger: ReactElement`
    (required), `placement?: "bottom-start" | "bottom-end" | "top-start" |
    "top-end"` (default `"bottom-start"`), `aria-label?: string`.
  - `MenuItem`: `onSelect: () => void` (required), `variant?: "neutral" |
    "danger"` (default `"neutral"`), `disabled?: boolean` (default `false`).
  - `MenuSeparator`: no props by design.
- Produces: nothing exported.

**Two behaviours this task must get right — read before writing code:**

1. **Menu is controlled-only (D53, following D50).** `onClose(reason)` only
   *reports*; the menu stays open until the consumer flips `open`. So
   `onClose` must call `setMenuOpen(false)` for **all three** reasons, or Esc
   and item-select will appear dead.
2. **A plain toggle is correct here — do not add a re-open guard.** An earlier
   draft of this plan asserted that clicking the trigger while open would
   light-dismiss and then immediately re-open. **That was investigated in a
   real browser (Chrome 148) and refuted.** The light dismiss lands on
   `pointerdown`, *before* `click`, and the `toggle` event that drives
   `onClose` is queued and arrives ~50ms *after* `click`. So the trigger's
   `onClick` still observes `open === true`, toggles to `false`, and the late
   `onClose("outside")` agrees. Final state closed, no flicker.

   Caveat recorded for whoever reads this later: that ordering is a Chromium
   observation and was not verified in Firefox or WebKit. The robust fix
   belongs in the component (see "Related Menu bugs" at the foot of this
   plan), not in consumer code here.

- [ ] **Step 1: Extend the imports**

In `apps/promo/src/sections/Playground.tsx`, update the two import statements
at the top:

```tsx
import { useRef, useState } from "react";
import {
  Button,
  Checkbox,
  IconButton,
  IconPlus,
  IconSearch,
  IconSettings,
  Input,
  Menu,
  MenuItem,
  MenuSeparator,
  Panel,
  Select,
  Switch,
  Tag,
  Toolbar,
  Tooltip,
  type ButtonProps,
} from "@handamade/psi-react";
```

- [ ] **Step 2: Add state inside `Playground`**

Directly after the existing `filters` state declaration (currently ending
line 49), add:

```tsx
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastReason, setLastReason] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const closeMenu = (reason: "item-select" | "esc" | "outside") => {
    setLastReason(reason);
    setMenuOpen(false);
  };

  const toggleMenu = () => setMenuOpen((open) => !open);
```

This card renders a **single** Menu with its own state. The confirmed D53 bug
(a stale light-dismiss report closing a *different*, newly-opened menu) needs
two menus sharing one `openId`, so this card cannot hit it.

- [ ] **Step 3: Add the card**

Insert this `Panel` immediately after the closing `</Panel>` of the
`pg-surface` card and before the closing `</div>` of `.playground`:

```tsx
          <Panel className="card pg-menu">
            <h3>
              Menu · the 0.8 overlay tier
              <a className="sb-link" href={storybookDocs("Components/Menu")}>
                storybook →
              </a>
            </h3>
            <div className="pg-row">
              <Menu
                open={menuOpen}
                onClose={closeMenu}
                aria-label="Row actions"
                trigger={
                  <IconButton
                    aria-label="Row actions"
                    variant="neutral"
                    size={32}
                    onClick={toggleMenu}
                  >
                    <IconSettings />
                  </IconButton>
                }
              >
                <MenuItem onSelect={() => setLastAction("Edit")}>Edit</MenuItem>
                <MenuItem onSelect={() => setLastAction("Duplicate")}>
                  Duplicate
                </MenuItem>
                <MenuSeparator />
                <MenuItem variant="danger" onSelect={() => setLastAction("Delete")}>
                  Delete
                </MenuItem>
              </Menu>
              <span className="annot" aria-live="polite">
                {lastReason
                  ? `onClose("${lastReason}")${lastAction ? ` · ${lastAction}` : ""}`
                  : "no dismissal yet"}
              </span>
            </div>
            <p className="annot pg-note">
              Native Popover API: the top layer and light dismiss come from the
              browser, the roving keyboard and dismissal reasons from Psi.
              Controlled-only — Esc and item-select only <em>report</em> a
              dismissal; this card is what flips <code>open</code>. Try all
              three: Esc, a click outside, and picking an item.
            </p>
          </Panel>
```

- [ ] **Step 4: Add `Menu` to the index list**

In the `pg-index` array (currently line ~234), add `"Menu"` after `"Dialog"`:

```tsx
            "Button",
            "IconButton",
            "Input",
            "Select",
            "Checkbox",
            "Switch",
            "Tag",
            "Tooltip",
            "Field",
            "Dialog",
            "Menu",
            "Panel",
            "Toolbar",
```

- [ ] **Step 5: Typecheck**

```bash
pnpm --dir apps/promo exec tsc -p tsconfig.json --noEmit
```

Expected: no output, exit 0. A `Type '"esc"' is not assignable` error means
`closeMenu`'s parameter union does not match `MenuProps["onClose"]` — copy the
union from the Interfaces block above verbatim.

- [ ] **Step 6: Browser check — all three dismissal reasons**

Reload, scroll to `02 · Components`, find the "Menu · the 0.8 overlay tier"
card. Run all four checks:

| Action | Expected |
| ------ | -------- |
| Click the gear trigger | Menu opens below-start |
| Press `Esc` | Menu closes; annotation reads `onClose("esc")` |
| Reopen, click empty page area | Menu closes; reads `onClose("outside")` |
| Reopen, click "Edit" | Menu closes; reads `onClose("item-select") · Edit` |
| **Reopen, click the gear again** | **Menu closes and stays closed** |

The last row is a regression check on the refuted re-open hypothesis. In
Chrome it passes with the plain toggle. If it *does* flicker shut and reopen,
the browser orders `toggle` before `click` — record which browser and report
back rather than patching around it here; that is the component fix's job.

- [ ] **Step 7: Browser check — keyboard and roving tabindex**

Open the menu with the trigger, then press `ArrowDown` repeatedly.

Expected: focus moves Edit → Duplicate → Delete, skipping the separator;
`Enter` on "Delete" closes the menu and reads `onClose("item-select") ·
Delete`. The Delete item renders in the danger colour.

- [ ] **Step 8: Commit**

```bash
git add apps/promo/src/sections/Playground.tsx
git commit -m "docs(promo): Menu card — the 0.8 overlay tier, live

Menu's first real controlled consumer: every story ships open:true, so
nothing in the repo exercised a real toggle. Handles all three onClose
reasons.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Two update entries

**Files:**
- Modify: `apps/promo/src/content/updates.ts`

**Interfaces:**
- Consumes: the existing `UpdateEntry` interface — `date: string` (ISO),
  `tag: "release" | "components" | "tokens" | "docs" | "site"`, `title:
  string`, `body: string`, `link?: { label: string; href: string }`.
- Produces: nothing. `UPDATES` keeps its type.

The file's docblock states the rule: *curated announcements, not a changelog
mirror*. Four releases shipped since the last entry; only two have
outside-world consequence. **Do not add 0.7.1** (generated docs stopped
fabricating API surface — an artifact correctness fix with no consumer-visible
effect).

- [ ] **Step 1: Prepend both entries**

Insert at the **top** of the `UPDATES` array, before the `2026-07-21` /
`0.7.0` entry:

```ts
  {
    date: "2026-07-31",
    tag: "release",
    title: "0.8.0 — Menu, and shape becomes themeable",
    body: "Menu lands on the native Popover API: the top layer and light dismiss come from the platform, the roving keyboard and dismissal reasons from Psi. And the --psi-control-* family completes — height, padding, gap and font became tokens (D54–D55), then radius (D56). A customer theme can now retune control shape in one line, which Palette + SlotMap could not express before.",
    link: { label: "Browse the Storybook", href: "/storybook/" },
  },
  {
    date: "2026-07-21",
    tag: "release",
    title: "0.7.2 — MIT, declared",
    body: "All three packages had been published with no license field, which npm reads as all-rights-reserved: installable, but not legally reusable — the opposite of the intent. Every package now declares MIT and ships a LICENSE in its own tarball.",
  },
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --dir apps/promo exec tsc -p tsconfig.json --noEmit
```

Expected: no output, exit 0.

- [ ] **Step 3: Browser check**

Reload and scroll to the Updates section.

Expected: the feed leads with "0.8.0 — Menu, and shape becomes themeable"
(dated 2026-07-31, `release` tag), then "0.7.2 — MIT, declared", then the
existing "0.7.0 — Panel, Toolbar, and the surface family". Dates read in
descending order down the list, and the 0.8.0 entry shows a working "Browse
the Storybook" link.

- [ ] **Step 4: Commit**

```bash
git add apps/promo/src/content/updates.ts
git commit -m "docs(promo): announce 0.8.0 and the MIT declaration

Curated, per the file's own rule: 0.7.1 stays out (an artifact fix with
no consumer-visible effect).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Roadmap — shipped rows and the theme console

**Files:**
- Modify: `apps/promo/src/sections/Roadmap.tsx`

**Interfaces:**
- Consumes: the `SHIPPED` and `NEXT` arrays — both
  `readonly [title: string, detail: string][]`, rendered identically.
- Produces: nothing exported.

Task 1 already fixed line 4's counts. This task adds rows only.

- [ ] **Step 1: Add four rows to `SHIPPED`**

Append after the existing `Toolbar` entry (currently line 15), keeping the
`as const`:

```tsx
  ["Menu", "action menu on the native Popover API — top layer and light dismiss from the platform, roving keyboard and dismissal reasons from Psi (D53)"],
  ["Control ramp", "height, padding, gap and font for Button, IconButton, Input and Select are per-size tokens, not CSS literals (D54–D55)"],
  ["Control radius", "one size-invariant dial, --psi-control-radius, drives control shape across six components (D56)"],
  ["MIT licensed", "open core — all three packages declare MIT and ship a LICENSE in their own tarball"],
```

- [ ] **Step 2: Add the theme console to `NEXT`**

```tsx
const NEXT = [
  ["Theme console", "a prompt in, a real customers/<name>.ts out — Palette, SlotMap and control radius, applied live"],
  ["Custom listbox Select", "v1 ships a styled native <select>; a fully custom listbox is v2"],
  ["Tooltip on the Popover API", "native anchor positioning once support settles"],
] as const;
```

The console goes **first** — it is the largest of the three and the dial in
`03 · Theming` is its visible groundwork.

- [ ] **Step 3: Typecheck**

```bash
pnpm --dir apps/promo exec tsc -p tsconfig.json --noEmit
```

Expected: no output, exit 0.

- [ ] **Step 4: Browser check**

Reload, scroll to `06 · Roadmap`.

Expected: "In v1 today" lists 16 rows ending with MIT licensed; the first row
reads "18 components, 22 icons" and its detail names Menu, MenuItem and
MenuSeparator. "Next" leads with "Theme console". Both panels stay
side-by-side at desktop width and stack below the breakpoint.

- [ ] **Step 5: Commit**

```bash
git add apps/promo/src/sections/Roadmap.tsx
git commit -m "docs(promo): D53-D56 in the roadmap, theme console in Next

Naming the console publicly is deliberate: the control-radius dial in the
Theming section is its visible groundwork.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Full verification and PR

**Files:** none modified.

- [ ] **Step 1: Full gate**

```bash
nvm use && pnpm build && pnpm test && pnpm lint
```

Expected: all three exit 0. `pnpm build` is the WCAG AA contrast gate; it
should be unaffected, since no token changed. If contrast fails here,
something outside this plan's scope was edited — stop and report.

- [ ] **Step 2: Production build of the promo app**

```bash
pnpm --dir apps/promo build
```

Expected: `tsc` clean, then Vite writes `dist/`. This is stricter than the dev
server — it is the first full typecheck plus bundle of the changed sections.

- [ ] **Step 3: Responsive check**

With the dev server running, use `resize_window` at `mobile` (375×812).

Expected: the dial wraps rather than overflowing; the theme grid stacks to one
column; the Menu card's trigger and annotation stay on-screen; no horizontal
page scroll.

- [ ] **Step 4: Dark-theme check**

Click the header's theme toggle through to `dark`.

Expected: the dial's track and thumb remain visible against the dark canvas
(`accent-color` binds `--psi-fill-accent`, which re-derives per theme); the
Menu's surface picks up the dark `--psi-surface-*` family.

- [ ] **Step 5: Do NOT run `pnpm vr`**

The VR suite renders Storybook stories, not the promo app, and its baselines
are ubuntu-latest — a macOS run fails all 180 stories and its default update
mode silently writes junk baselines. CI's `vr` job is the gate.

- [ ] **Step 6: Push and open the PR**

```bash
git push -u origin docs/promo-refresh-0-8-0
gh pr create --title "docs(promo): refresh the site to 0.8.0" --body "$(cat <<'EOF'
The site's last update entry was 0.7.0, its component count predated Menu,
and its Theming section still described a customer brand as colour alone —
a claim D56 made understated.

- Counts track `dist/manifest.json` (15 → 18). Icon count (22) and theme
  count (4) were already correct and are unchanged.
- **A live `--psi-control-radius` dial** on the three theme cards, stepping
  the published rung scale (4|6|8|12). Tag and Switch stay pill on purpose.
- **A Menu card** — Menu's first real controlled consumer, handling all
  three `onClose` reasons.
- Two curated update entries (0.8.0, and the MIT declaration).
- D53–D56 in the roadmap; the theme console named in "Next".

No package change, no changeset — `apps/promo` is private.

Spec: `docs/superpowers/specs/2026-07-31-promo-refresh-design.md`
Plan: `docs/superpowers/plans/2026-07-31-promo-refresh.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 7: Arm auto-merge, then verify it armed**

```bash
gh pr merge --auto --squash
```

Then **read it back** — `gh pr merge --auto` exits 0 and prints nothing while
leaving auto-merge OFF:

```bash
gh pr view --json autoMergeRequest
```

Expected: `autoMergeRequest` is **not** `null`. If it is null, use the
`enablePullRequestAutoMerge` GraphQL mutation, which does work:

```bash
PR_ID=$(gh pr view --json id -q .id)
gh api graphql -f query='mutation($id:ID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:SQUASH}){clientMutationId}}' -f id="$PR_ID"
gh pr view --json autoMergeRequest
```

---

## Known carry — do not fix in this plan

**Card radius sits outside the dial.** At `radius-4` the controls sharpen
while the surfaces around them stay rounded. Two causes:

1. `--psi-card-radius` is on no dial — recorded in the D56 spec as D57's first
   problem.
2. `apps/promo`'s own `.theme-card-ui` hardcodes `border-radius:
   var(--psi-radius-12)` (`promo.css:510`).

Both are out of scope by explicit decision. If a reviewer flags the visual
seam, point them here.

**`pnpm release` does not push tags.** Unrelated one-liner, deliberately not
bundled into this branch (`CLAUDE.md`: one branch, one PR).

## Related Menu bugs — separate branch, not this one

A browser investigation on 2026-07-31 (Chrome 148) found four real faults in
`packages/react/src/Menu`. **None of them block this plan** — the promo card
is a single Menu inside a flex row with `align-items: center`, which hits
neither the shared-state bug nor the anchor-stretch bug. They are recorded
here only so nobody tries to fix them on this branch; `packages/` changes need
their own PR and a changeset.

1. **Stale light-dismiss report closes the wrong menu.** With two menus
   sharing one `openId`, opening B while A is open leaves *both* closed. When
   the platform light-dismisses A, A's popover is already closed by the time
   its `open` prop flips, so the sync effect takes neither branch
   (`Menu.tsx:108`) and never arms `suppressNextCloseRef`. The queued toggle
   then reports `onClose("outside")` at `Menu.tsx:125` for a menu the consumer
   has already closed, and the consumer clears `openId` — killing B. This
   breaks the shipped `row-actions` pattern's most natural implementation.
2. **The anchor box stretches.** `.trigger` is `display: inline-flex` with no
   width (`menu.module.css:4`). As a *grid* item (`justify-self: stretch`) or
   a *flex-column* item (`align-items: stretch`) it fills the cell, so the
   menu anchors to the cell rather than the button. Flex rows with
   `align-items: center` are unaffected.
3. **The `Placements` story is unrenderable.** `popover="auto"` mutually
   dismisses, so four sibling popovers cannot be open at once — only the
   last-mounted survives.
4. **`FallbackPlacement` contaminates the preview iframe.** It overwrites
   `CSS.supports` without restoring it and injects a `<style>` scoped to
   `[data-psi-menu]` document-wide, so every Menu rendered afterwards in the
   same session — including the autodocs page — takes the fallback branch.

Test-gap note: `vitest.setup.ts`'s Popover polyfill is synchronous with no
light dismiss and no mutual dismissal, so this whole bug class is unreachable
from jsdom. Its comment claims light dismiss is "exercised in Playwright VR" —
VR only takes screenshots, so in practice it is exercised nowhere.
