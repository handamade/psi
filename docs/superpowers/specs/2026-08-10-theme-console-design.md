# The theme console — a prompt in, a real customer theme out (D57)

Date: 2026-08-10. Status: **Draft** — targets `apps/promo`, `packages/tokens`,
and one new Vercel Function.

Provenance: D57 was reserved for this work by the D56 control-radius spec
(2026-07-31), whose sequencing note scoped it as "prompt → constraint vector →
`Palette` + `SlotMap` + control radius, applied live and exported as a real
`customers/<name>.ts`". That reservation has held unclaimed through D58–D80;
this spec claims it.

The D56 spec's provenance was a *teardown* of southleft.com's
`<theme.console>`. This spec is grounded in a re-examination of the live
implementation (2026-08-10), which corrected two assumptions carried in that
teardown:

1. **It is not a single-stage LLM feature.** A deterministic local derivation
   renders instantly; a remote stage then optionally refines it. The console's
   own transcript distinguishes them — `art direction: claude · "<name>"` when
   the remote stage returned, `art direction: local seed engine (<hash>)` when
   it did not, followed by `// art director unreachable — the local derivation
   stands.` The local engine is a keyword→hue dictionary (49 entries), a
   keyword→chroma-delta dictionary (26 entries), fixed motion/texture/font
   catalogs, and an FNV-1a hash of the prompt seeding a PRNG so that
   unrecognised words still derive something and identical prompts derive
   identically.
2. **WCAG AA is enforced by a solver, not a gate.** A binary search over
   lightness (28 iterations) converges each pair onto its target ratio. This is
   why "zero failures — by construction" is literally true there rather than
   marketing.

The second point is the one that shapes this design. Psi's AA enforcement is a
build-time *gate* that throws. A gate cannot serve an unbounded input space:
free text is infinite, so no enumeration of generated themes can be tested in
advance. Generated themes need the solving variant of the same math.

## Decisions

- **D57 — A brand is derived through a `BrandVector`, and every producer of one
  is untrusted.** Two producers feed one pipeline:

  ```
  prompt ──┬─► parsePrompt()   ─► BrandVector ─┐
           │   (local, instant)                 ├─► deriveTheme() ─► CustomerTheme
           └─► POST /api/theme ─► BrandVector ─┘   (+ AA solver)
               (model, optional)
  ```

  ```ts
  interface BrandVector {
    hue: number;                     // 0–360, the accent anchor
    chroma: "muted" | "calm" | "balanced" | "vivid" | "electric";
    base: "light" | "dark";
    radius: 4 | 6 | 8 | 12;          // on-scale rungs only (D56)
    fonts?: BrandFonts;              // roles from a fixed catalog (D29)
    name: string;                    // slug for customers/<name>.ts
  }
  ```

  **`/api/theme` returns a `BrandVector`, never colours.** The model emits a
  brief — a hue number, a chroma word, a radius rung, font roles drawn from a
  closed catalog — and Psi's own OKLCH formulas do everything downstream. Three
  properties follow, and together they are the reason the remote stage is safe
  to ship:

  - The AA solver runs identically on both paths. No model response can reach a
    rendered colour without passing through it.
  - Validation is a schema check over a closed set, not trust in arbitrary
    colour output. An off-scale radius or an unlicensed font is unrepresentable
    rather than merely discouraged.
  - The remote stage is an *enhancement*. With no API key configured — local
    dev, CI, a fork — the console works completely, because the local
    derivation is the floor and not a fallback bolted on afterwards.

  `parsePrompt` is deterministic: an FNV-1a hash of the lowercased prompt seeds
  a PRNG, so an unrecognised prompt still derives a coherent theme and the same
  prompt always derives the same one. This is what makes free text safe input
  without validation or error states.

## Design

The four commitments below are consequences of D57 rather than separate
decisions, and are recorded here so implementation cannot quietly reverse one.

- **Generated themes are *solved* to AA; shipped themes stay *gated*.**
  `packages/tokens/src/contrast-matrix.ts` already implements the WCAG maths
  (`checkContrast`, `compositeHex`, `wcagAAPairs`). The new
  `solveL(hue, chroma, bgHex, targetRatio)` binary-searches lightness using
  `checkContrast` as its predicate, so **the repository keeps exactly one WCAG
  implementation**. Chroma gamut handling remains Psi's existing `cap()` and
  `gamutWarnings`.

  The build gate is unchanged and still throws for themes committed to
  `src/themes/`. The two mechanisms are complementary, and the distinction is
  load-bearing prose rather than an implementation detail: `apps/promo` claims
  "WCAG AA is a build gate, not a guideline" in the Theming section
  (`Theming.tsx:137`). With whole-page theming that section is repainted by a
  console-derived theme, so the sentence is read *while a solved theme is on
  screen*. It must not become false by implication — the Theming copy gains the
  gated/solved distinction rather than losing the claim.

- **The console themes the whole page, and pinned demos stay pinned.**
  The derived token set is applied as inline custom properties on
  `documentElement`, with `data-psi-theme="custom"` as a state hook. Theme CSS
  emits under `[data-psi-theme="<name>"]` and components under
  `:where(:root, [data-psi-theme])`, so inline properties on `<html>` inherit
  everywhere **except** into an element declaring its own `data-psi-theme` —
  that element's own rule beats an inherited value.

  The Theming section's three preview cards each set `data-psi-theme={name}`
  on themselves (`Theming.tsx:35`), so they remain pinned to light/dark/acme
  under any generated theme. This is not incidental: those cards *are* the
  argument that themes are attribute-scoped, and a generated theme swallowing
  them would make the section self-refuting. **It gets a test, not a comment.**

  Two consequences are designed for rather than discovered:

  - **Restore before first paint.** The theme persists to `localStorage` and is
    reapplied by a small inline script in `<head>`, or a returning visitor sees
    the default theme flash into their custom one.
  - **Reset is always one click away.** A reset control is permanently visible
    while a custom theme is active.

- **The hero's formula card is subsumed, not displaced.** The Δ-lightness
  demo (`Hero.tsx:61–115`) becomes the console's derived-state row: the same
  `oklch(from …)` hover/active swatches, now driven by the accent the visitor
  just derived. It currently proves derivation on a hardcoded token; afterwards
  it proves derivation on an invented theme. The hero's headline — "Color isn't
  picked. It's *computed*." — is better served, not weakened.

  **This costs no new CSS.** The three swatch rules already read
  `oklch(from var(--psi-fill-accent) calc(l + var(--delta, 0)) …)`
  (`promo.css:332–344`) — they derive from a Psi token rather than a literal,
  so a generated theme that sets `--psi-fill-accent` moves them automatically.
  The Δ slider keeps working on top, now composing with the derived accent.

- **The console emits real `customers/<name>.ts` source.** Below the
  preview, the generated file renders as copyable source in the shape of
  `packages/tokens/src/themes/customers/acme.ts`: `Palette`, `SlotMap`, a
  control-radius override, and `fonts` when the vector carries them.

  This settles an existing inaccuracy. The Theming section already captions its
  code block `scaffolded by \`pnpm new-theme acme\`` (`Theming.tsx:108`) — **a
  command that does not exist anywhere in the repository.** The console makes
  the generation claim true through the browser; the caption is corrected to
  describe what actually exists.

## Architecture

| Unit | Location | Depends on |
| --- | --- | --- |
| `parsePrompt`, dictionaries, font catalog | `packages/tokens/src/generate/` | nothing |
| `deriveTheme`, `solveL` | `packages/tokens/src/generate/` | `contrast-matrix.ts`, `dsl/` |
| `serializeCustomerTheme` | `packages/tokens/src/generate/` | `dsl/` types |
| `/api/theme` | `api/theme.ts` | `generate/` types, AI Gateway |
| Console UI | `apps/promo/src/sections/Hero.tsx` | `@handamade/psi-tokens` |

`generate/` is pure and dependency-free, matching the package's zero-runtime-
dependency contract, and is imported unchanged by the browser, the Function,
and any future CLI. `api/theme.ts` is a sibling of the existing `api/mcp.ts`;
`vercel.json` already deploys Functions from `api/`, and `apps/promo` already
serves at `/` via `tools/assemble-site.mjs`, so `/api/theme` needs no rewrite
and no new infrastructure category.

## Non-goals

- **No CLI.** `pnpm new-theme <name>` writing a real file and registering it in
  `customers/index.ts` is the natural sequel and reuses `generate/` unchanged.
  It is a separate spec; this one produces source in the browser.
- **No new token families.** Southleft themes texture, elevation and motion;
  Psi has no such families, and each would be its own decision before a console
  could drive it. Scope is colour, control radius, and the `BrandFonts` roles
  `CustomerTheme` already supports (D29).
- **No webfont loading.** Psi ships no font files and does not start here. The
  vector carries role assignments; consumers load the webfonts.
- **No DTCG export.** Southleft's `copy tokens (dtcg)` is attractive and out of
  scope; Psi's export story is the resolved-token JSON the build already emits.
- **No changeset for `apps/promo`.** It is not a published package. The
  `packages/tokens` half is user-visible and does carry one.

## Known carry

**`--psi-card-radius` sits on no dial.** Recorded in the D56 spec as "D57's
first problem" and still true: a generated theme sharpens controls while
surfaces stay rounded. The D56 spec deliberately scoped the dial to controls,
and putting Card on it is a token decision, not a console decision. The console
will visibly expose the gap on the hero card. Left for its own D number rather
than smuggled in here.

`apps/promo`'s `.theme-card-ui` also pins `border-radius:
var(--psi-radius-12)` (`promo.css:563`) — an app-level rung binding, not on
the control dial, and so unaffected by a generated theme's radius.

Beyond that one rule, `apps/promo` is fully token-bound and needs no
preparation for whole-page theming: the stylesheet contains three colour
literals in total, all three `oklch(from var(--psi-fill-accent) …)`, and its
app-level custom properties derive from Psi tokens (`--promo-hairline` is
`color-mix(in oklab, var(--psi-fg-primary) 12%, transparent)`). A generated
theme therefore reaches the whole page rather than half of it.

## Verification

- **All five gates** — `pnpm build && node tools/check-docs-drift.mjs &&
  pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site`.
  `check-docs-drift` matters here: the Theming section's prose changes and the
  `pnpm new-theme` caption is corrected. `test:site` (D76) covers `apps/promo`
  and needs `apps/promo/dist` to exist first.
- **Unit** — `parsePrompt` determinism (same prompt → same vector; unknown
  words still derive); `solveL` convergence against `checkContrast` across the
  hue circle at both `base` values; `serializeCustomerTheme` output parses as
  valid TypeScript matching the `CustomerTheme` shape.
- **The pinned-demo test** — a generated theme applied to `documentElement`
  must not alter the three `data-psi-theme` cards in the Theming section.
- **Contract** — `/api/theme` responses failing `BrandVector` validation are
  rejected and the local derivation stands; a timeout, a non-2xx and an absent
  API key each leave a fully working console.
- **Browser** — derive with the remote stage unconfigured (local path), then
  configured; confirm restore-before-paint on reload, and reset.
- `pnpm vr` is unaffected — the VR suite covers Storybook stories, and no
  package renders differently by default. CI remains its gate regardless.

## Rejected alternatives

- **Deterministic only, no remote stage.** The initial recommendation, made
  before the live implementation was examined. Rejected once the two-stage
  architecture was understood: the local engine is the floor either way, so the
  remote stage costs one Function beside an existing one and degrades to
  exactly the deterministic-only design when absent. Refusing it would forgo
  the interesting half at no saving in robustness.
- **`/api/theme` returning colours.** The obvious shape and the dangerous one.
  It would put model output on the rendered surface, requiring colour
  validation, contrast re-checking and gamut repair on data of unknown
  provenance. Returning a `BrandVector` makes the bad states unrepresentable.
- **Enumerate the constraint space and test every theme for AA.** Workable for
  a closed set of chips; impossible for free text. This alternative was the
  original AA plan and is what the live teardown corrected — it is recorded
  because it is the intuitive wrong answer.
- **Chip-based input instead of free text.** Typo-proof and trivially
  enumerable, but it abandons the "prompt in" premise the roadmap line
  promises, and the hash-seeded fallback already makes free text safe without
  error states.
- **Theming only the hero card.** Safer and much less impressive. Rejected
  deliberately: whole-page repaint is the demonstration. The cost is accepted
  and stated below.
- **Keeping the Δ-lightness card beside the console.** Two sliders competing in
  one hero. Folding the derivation demo into the console makes it stronger,
  since it then derives from a theme the visitor invented.

## Accepted cost

Whole-page theming means a visitor's prompt repaints the sections arguing for
Psi's own design decisions. The AA solver keeps every generated theme readable
and the reset control keeps it recoverable, but "impressive" and "on-message"
are in genuine tension here. The trade is accepted for the hero demo, and
recorded so a later reviewer sees it was chosen rather than overlooked.
