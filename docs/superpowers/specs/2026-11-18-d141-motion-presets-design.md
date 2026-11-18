# Named motion presets — a duration and an easing chosen together, by intent (D141)

Date: 2026-11-18. Status: **Accepted**, building on branch `d141-motion-presets`.

Provenance: a consumer's sidebar trial asked for a sidebar that animates open
and closed (D142). Before `AppShell` gets its own motion tokens, Psi names the
motions it already uses, so the sidebar's tokens point at a preset and not at a
pair of loose scale steps.

D141 and D142 were free on every `origin/*` branch and in both open PRs (#191,
#195) on 2026-11-18. D139/D140 (#195) is in flight at the same time and owns
`packages/tokens/src/emit/**`, `src/theme/**`, `src/scope-gate.ts`,
`navbar.module.css`, both `llms.txt` files and `scripts/build.ts`, so this work
lands on top of #195's merge. **Check the numbers again when the PR opens.**

## What's there today

The scale (`packages/tokens/src/scales/motion.ts`, WS3/D30): five durations,
`--psi-duration-150/200/350/450/600`, and three easings, `--psi-ease-standard`
(`ease`), `--psi-ease-in-out` (`ease-in-out`) and `--psi-ease-soft`
(`cubic-bezier(0.2, 0.6, 0.2, 1)`). Both are emitted at `:root` in
`base.css` (`@layer psi.base`). `utilities.css` (`@layer psi.utilities`) sets
every `--psi-duration-*` to `0.01ms` under `prefers-reduced-motion: reduce`.

Every component picks its own pair. The full inventory, from a grep of
`packages/react/src/**/*.module.css` and `scripts/emit-utilities.ts`:

| pair | where | what moves |
|---|---|---|
| 150 + `standard` | `Button`, `IconButton`, `Input`, `Select`, `Textarea`, `Combobox` (border, outline, chevron `rotate`), `Checkbox`, `RadioGroup`, `SegmentedControl`, `Switch` (track colour, thumb `left`), `Tabs`, `NavTree` (chevron `transform`), `.psi-link` | colour, outline, a chevron's turn, a toggle's thumb |
| 150 + `soft` | `NavBar` link | colour |
| 200 + `soft` | `Dialog` (backdrop, dialog, drawer enter), `Toast` (enter) | something entering, moving in from an edge |
| 350 + `standard` | `Card` `hoverLift` | a lift, `translateY(-6px)` |
| 450 + `soft` | `.psi-media-tint` (D35) | a filter fading to true colour |
| 600 + `in-out` | `Skeleton` pulse (D86) | an infinite pulse |

So Psi already has three motions, plus two one-offs: state feedback at 150,
entering and moving at 200, emphasis at 350.

## Measured: a preset alias declared at `:root` still zeroes under reduced motion

This was the main risk. A preset is `--psi-motion-feedback-duration:
var(--psi-duration-150)`, declared at `:root` in `@layer psi.base`. The
reduced-motion rule re-declares `--psi-duration-150` at `:root` in a later
layer, `psi.utilities`. A `var()` in a custom property resolves on the element
that declares it, against that element's cascaded value, and the descendants
inherit the result. So the alias at `:root` should read the utilities layer's
`0.01ms`, whatever layer the alias itself sits in.

Measured on a static page: this branch's built `base.css`, `light.css`,
`dark.css`, `components.css` and `utilities.css`, plus the candidate emission
in a `<style>`. `getComputedStyle(el).transitionDuration` with Playwright's
`emulateMedia({ reducedMotion })`:

| element | binds | no-preference | reduce |
|---|---|---|---|
| on the page | a preset, `@layer psi.base` `:root` | 0.15s | 1e-05s |
| on the page | a component alias of a preset, `:where(:root)` (page-scoped, D139) | 0.2s | 1e-05s |
| on the page | a component alias, `:where(:root, [data-psi-theme])` (theme-scoped) | 0.15s | 1e-05s |
| in a `data-psi-theme="dark"` sub-theme | each of the three above | 0.15s / 0.2s / 0.15s | 1e-05s |
| in the sub-theme | a theme override `var(--psi-duration-350)` in `@layer psi.theme` | 0.35s | 1e-05s |

Chromium 1254 and WebKit 2311 agree (WebKit reports `0.00001s`). Firefox does
not launch in this sandbox; the rule it would follow is the same CSS Variables
spec rule, and CI's Chromium is the gate. **The emission needs no fix.** The
presets go in `base.css` beside the scale they alias.

What *would* break reduced motion is a literal: a theme override
`app-shell-sidebar-duration: 200ms` never reads a `--psi-duration-*` token, so
nothing zeroes it. That is the scope gate's new rule below.

## Decisions

### D141 — Three motion presets, `feedback`, `move` and `emphasis`; each is a duration token and an easing token that alias the scale, and every transition in Psi's component CSS binds one

**The presets** (`packages/tokens/src/scales/motion.ts`, `motionPresets`):

| preset | duration | easing | intent | used by |
|---|---|---|---|---|
| `feedback` | `--psi-duration-150` | `--psi-ease-standard` | a control answers a pointer or a key: colour, border, outline, a chevron's turn, a toggle's thumb | every control, `Tabs`, `NavTree`, `NavBar`, `.psi-link` |
| `move` | `--psi-duration-200` | `--psi-ease-soft` | something enters, leaves or changes size: a dialog, a drawer, a toast, a sidebar | `Dialog`, `Toast`, `AppShell` (D142) |
| `emphasis` | `--psi-duration-350` | `--psi-ease-standard` | a deliberate, noticeable change that draws the eye to one thing | `Card` `hoverLift` |

Names are intents, not speeds: `quick`/`slow` would say nothing about which to
pick and would be wrong the day a value changes. `feedback`, `move` and
`emphasis` answer the question a component author has: *what is this motion
for?*

**Each preset is a pair of tokens**, emitted in `base.css` at `:root`, right
after the scale:

```css
--psi-motion-feedback-duration: var(--psi-duration-150);
--psi-motion-feedback-ease: var(--psi-ease-standard);
--psi-motion-move-duration: var(--psi-duration-200);
--psi-motion-move-ease: var(--psi-ease-soft);
--psi-motion-emphasis-duration: var(--psi-duration-350);
--psi-motion-emphasis-ease: var(--psi-ease-standard);
```

Two tokens, not a shorthand (`--psi-motion-move: 200ms cubic-bezier(…)`): a
component's own motion tokens point at each half
(`--psi-app-shell-sidebar-duration: var(--psi-motion-move-duration)`), a
transition list needs the duration and the easing in separate positions, and an
`animation` shorthand cannot take a `transition`-shaped value. Both halves
alias the scale, so reduced motion reaches them through the duration (measured
above), and a theme that retunes the scale retunes every preset.

The source of truth is one typed record, so a preset can only name a scale step
that exists:

```ts
export const motionPresets = {
  feedback: { duration: 150, ease: "standard" },
  move: { duration: 200, ease: "soft" },
  emphasis: { duration: 350, ease: "standard" },
} as const satisfies Record<string, { duration: (typeof durationScale)[number]; ease: keyof typeof easings }>;
```

Every emitter reads it: `base.css` (the tokens), `resolved/<theme>.json`
(`scales.motion.presets`), the DTCG file (`motion.<name>.duration` and `.ease`
as aliases `{duration.150}`, `{ease.standard}`), `guidance.json`
(`motion.presets`, with each preset's intent), and the site's motion page.

**`NavBar`'s 150 + `soft` joins `feedback`.** It is a link changing colour on
hover, the same motion as a `Tabs` tab, and the only colour change in Psi on a
soft curve. No decision chose it: the line came in with the commit that first
styled NavBar's links (2026-07-19), with no reason given. Over 150ms the two
curves differ by a few percent of a colour step. One curve for every colour change is the point of a preset.

**`Dialog`'s and `Toast`'s enter animations join `move`.** They were already
200 + `soft`: a dialog, a drawer and a toast each move in. That is the pair the
sidebar will use, so `move` is not a guess: three components agree on it before
D142 adds the fourth.

**Two exceptions stay on the scale, and say why in the CSS:**
- `Skeleton`'s pulse, 600 + `in-out` (D86). It is not a transition but an
  infinite alternating animation, which reduced motion removes outright rather
  than zeroes. No other motion in Psi has that shape.
- `.psi-media-tint`, 450 + `soft` (D35). A brand-defined filter fading to true
  colour over a long, ambient time; it is a utility for portfolio media, not
  component feedback, and no component shares it. A fourth preset for one
  utility would be a name with one user.

**Zero pixel change.** Every migrated transition keeps its duration and its
easing, except `NavBar`'s curve. `vr` captures settled stills with animations
disabled, so no snapshot moves. Nothing a component renders at rest changes.

**A lint keeps it so.** `psi/component-tokens-only` (in
`tools/stylelint-plugin-psi-tokens.mjs`) accepts `--psi-motion-*` as a global
prefix, and a new check reports `var(--psi-duration-*)` or `var(--psi-ease-*)`
in a `transition*` or `animation*` declaration of component CSS: "bind a
`--psi-motion-*` preset". Skeleton's line carries a `stylelint-disable-next-line`
with its reason (D86). The literal-duration check stays. `motion` joins the
other scale-family lists: `ALLOWED_GLOBAL` in the stylelint plugin,
`SCALE_FAMILY_PREFIX` in `src/dsl/validator.ts` (a semantic token named
`motion-*` would be shadowed by the scale lookup), `SCALE_RE` in
`src/scope-gate.ts`, and D139's base-value list in
`src/emit/component-scope.ts`, so a component token aliasing a preset is
page-scoped like one aliasing a duration.

**The scope gate refuses a duration a theme could break reduced motion with**
(`src/scope-gate.ts`, run by `gateTheme` and the build). A component token
whose key's last segment is `duration` must be exactly
`var(--psi-duration-<step>)` or `var(--psi-motion-<preset>-duration)`, naming
a step or a preset that exists. This holds for Psi's own registry defaults and
for every theme's `componentOverrides`, built-in or loaded by the
`psi-theme` CLI. A literal (`200ms`, `0.2s`), a `calc()`, or a `var()` with a
fallback is refused with the key, the value and the two accepted forms. The
`-ease` half is not gated: a literal curve cannot break reduced motion, and a
brand may want its own curve.

Why exactly one `var()` and nothing else: `calc(var(--psi-duration-150) * 2)`
does zero under reduced motion (0.02ms), but `max(var(--psi-duration-150),
200ms)` does not, and a gate that parses math to tell them apart is more than
this needs. A theme that wants a different time picks a step or a preset.

## Consequences

- **A component author picks an intent, not two numbers.** A new transition
  binds a preset; the lint says so. Retuning `move` retunes every dialog,
  drawer, toast and sidebar together.
- **A theme can retune motion only through the scale or a component token.**
  The presets are `:root` aliases in `base.css`, not theme tokens: a theme that
  wants a slower Psi retunes `--psi-duration-*` the way it already could, or
  points one component's duration token at another preset.
- **Reduced motion is unchanged.** `utilities.css` still zeroes the scale, and
  every preset and every component duration token reaches it.
- **No pixel moves**, and no prop or class changes. A consumer sees new tokens
  only.

## File map

- `packages/tokens/src/scales/motion.ts` — `motionPresets`.
- `packages/tokens/scripts/emit-utilities.ts` — preset tokens in
  `emitScaleVarsCSS`; `.psi-link` binds `feedback`; `.psi-media-tint` keeps the
  scale with a comment.
- `packages/tokens/scripts/emit-json.ts`, `emit-dtcg.ts`, `emit-types.ts` (if it
  lists scale tokens) — presets.
- `packages/tokens/src/guidance.ts` — `motion.presets` with intents; the
  reduced-motion line names presets.
- `packages/tokens/src/dsl/validator.ts`, `src/scope-gate.ts`,
  `src/emit/component-scope.ts` — `motion` scale family; the duration rule.
- `tools/stylelint-plugin-psi-tokens.mjs` — `motion` prefix; the preset check.
- 16 component stylesheets in `packages/react/src/**` — bind presets.
- Docs: `packages/tokens/llms.txt` (Motion section), `packages/tokens/README.md`,
  `packages/react/llms.txt` (`Card` `hoverLift`), `Card.tsx` and its story's
  prose, `apps/site/src/pages/docs/tokens/[group].astro` (motion page).
- Tests: `packages/tokens/__tests__/scales.test.ts`, `emit-css.test.ts`,
  `emit-json.test.ts`, `emit-dtcg.test.ts`, `guidance.test.ts`,
  `scope-gate.test.ts`, `validator.test.ts`; a stylelint fixture test.

## Verification

- `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint &&
  pnpm --dir apps/site build && pnpm test:site`.
- `vr` in CI: no snapshot changes. Show the user the run before anything is
  committed over a baseline; none is expected.
- The reduced-motion probe above, rerun against the built `dist`.

## Follow-ups

- `apps/site/src/styles/site.css` animates the docs' theme switch at 200 +
  `soft` with the raw scale. It is the site, not Psi's component CSS, so it is
  left; move it to `move` when the site's CSS is next touched.
