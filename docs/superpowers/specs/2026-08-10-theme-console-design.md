# The theme console — a prompt in, a real customer theme out (D57)

Date: 2026-08-10. Status: **Draft** — targets `apps/promo`, `packages/tokens`,
and one new Vercel Function.

Scope note: D57 is the console itself (`packages/tokens` generator, the
Function, the hero). It arrives alongside a set of `apps/promo` changes —
header mark, appearance switcher, the `themes/light.ts` relocation — which
claim no decision numbers and are specified under "The promo page" below.
Further promo work (the Theming and Components sections' redesign) is
deliberately deferred to its own cycle.

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
    mode: "light" | "dark";          // which member to SHOW; both are derived
    radius: 4 | 6 | 8 | 12;          // on-scale rungs only (D56)
    fonts?: BrandFonts;              // roles from a fixed catalog (D29)
    name: string;                    // slug for customers/<name>.ts
  }
  ```

  `mode` is a presentation hint, not a derivation input — see "A brand is
  always a light/dark pair" below. A prompt reading *midnight* implies dark and
  *sunrise* implies light, so the console switches to the implied mode on
  derive; the other member exists either way.

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

- **A brand is always a light/dark pair, derived together.** `deriveTheme`
  returns both members from one `BrandVector`, each solved to AA
  independently. The header toggle then *selects* between them — an instant
  swap, with no re-derivation and no second solver pass.

  Only the lightness anchors invert; the brand's hue and chroma carry across
  both, which is what makes the pair read as one brand in two modes rather
  than two unrelated themes. The template in `scripts/new-theme.ts` already
  documents these two shapes — light uses `ink l≈0.25 / canvas l≈0.95`, dark
  uses `ink l≈0.95 / canvas l≈0.15` — so the pair is built from anchors the
  package already describes.

  **This needs no change to `CustomerTheme`.** Psi has no concept of one brand
  in two modes — `acme` is light, `ember` is dark, neither has a counterpart —
  but the existing types express a pair without extension: one `Palette`
  holding both lightness anchors, and two `SlotMap`s selecting between them.

  ```ts
  export const acmePalette: Palette = {
    acmeInkLight:    { l: 0.25, … },  acmeInkDark:    { l: 0.95, … },
    acmeCanvasLight: { l: 0.96, … },  acmeCanvasDark: { l: 0.15, … },
    acmeBrand: { … },   // hue + chroma shared by both members
  };
  export const acmeSlots     = { ink: "acmeInkLight", canvas: "acmeCanvasLight", … };
  export const acmeDarkSlots = { ink: "acmeInkDark",  canvas: "acmeCanvasDark",  … };
  ```

  The generated file registers two entries — `acme` and `acme-dark`, the
  second carrying `base: "dark"`. Teaching `CustomerTheme` about pairs
  directly would be cleaner and is a token-package decision with its own D
  number, deliberately not taken here.

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

  Three consequences are designed for rather than discovered:

  - **What persists is the `BrandVector`, never the resolved tokens.** This is
    the difference between a recoverable page and an unrecoverable one. A
    stored blob of resolved custom properties cannot be validated on read, has
    not passed `solveL`, and is reapplied before paint on every later visit —
    so one corrupt or stale payload poisons the page permanently, and the
    reset control ends up living inside the very theme it exists to escape.

    A `BrandVector` is six fields over a closed set. It is schema-checked on
    read, and anything that fails falls through to the default theme after
    clearing the key, so the failure mode is self-healing rather than sticky.
    Because only solver output can then reach the screen, **the reset control
    is legible by construction** — which is what makes whole-page theming
    defensible at all.

  - **Restore before first paint, without shipping the deriver in `<head>`.**
    Re-deriving needs `generate/`, which is too much to inline. So the vector
    is stored beside a *cache* of its resolved custom properties: the boot
    script applies the cache for paint, and the app then validates the vector,
    re-derives, and rewrites the cache if it disagrees.

    A cache that drifts — because the derivation changed between visits —
    therefore corrects itself within the same load, and the rewritten cache
    makes the *next* load correct before paint too. A visitor is never pinned
    to an old algorithm's output, and the worst case is one frame of stale
    colour rather than a permanently wrong theme.

  - **Reset restores the page, not the console.** One control, permanently
    visible while a custom theme is active, and its scope is explicit:

    | Cleared | Kept |
    | --- | --- |
    | inline custom properties on `documentElement` | `psi-theme` — the light/dark mode |
    | `data-psi-theme="custom"` | the prompt text in the input |
    | `psi-brand` — the stored vector and its cache | |

    The mode is deliberately **not** reset: a visitor who chose dark did not
    ask to leave it by discarding a brand. This falls out of the two keys
    being orthogonal — reset clears one and never touches the other. Keeping
    the prompt makes reset a comparison tool — reset, look, derive again —
    rather than a punishment for experimenting.

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

- **The console emits source the existing CLI could have written.**
  Below the preview, the generated file renders as copyable source in the shape
  of `packages/tokens/src/themes/customers/acme.ts`: `Palette`, `SlotMap`, a
  control-radius override, and `fonts` when the vector carries them.

  **`pnpm new-theme` already exists** — `packages/tokens/scripts/new-theme.ts`,
  wired at `packages/tokens/package.json:25`. It writes
  `customers/<name>.ts` and registers it in `customers/index.ts` at the
  `// <ds:register …>` marker, and it supports `--base dark`. The promo page's
  two references to it (`Theming.tsx:108`, `Roadmap.tsx:6`) are accurate and
  need no correction.

  What the CLI does *not* do is derive anything. Its template emits
  placeholder anchors — every hue hardcoded to 250/260, under comments reading
  "Replace with brand OKLCH anchors" and "tune to taste". The brand values are
  left as homework.

  **That is precisely the gap the console fills**, and it fixes the two units'
  relationship. `serializeCustomerTheme` emits the CLI's template shape
  *extended to a pair*: one `Palette` carrying both modes' lightness anchors,
  two `SlotMap`s, two registry entries. The CLI's single-mode output is the
  degenerate case of that form, not a different format — which is what keeps
  the browser and the CLI from drifting into two file layouts.

  The sequel is therefore not "build a CLI" but "teach the existing one to
  derive" — `pnpm new-theme acme --prompt "…"`, reusing `generate/` unchanged.
  At that point `--base` becomes redundant, since a derived brand carries both
  modes; retiring it is that spec's decision.

  One detail in that template is evidence for the solver decision above: it
  warns by hand that "warning in particular must stay light enough to carry
  black label text at 4.5:1". A derived theme has no such footnote, because
  `solveL` guarantees it.

## The promo page

**No D numbers are claimed below.** Following the precedent set by the
2026-07-31 promo refresh, `apps/promo` is a consumer app of the packages; page
changes that alter no token, component or public contract are not decisions.
They are recorded here because the console lands in the middle of them.

- **The header carries a Ψ mark and an appearance switcher, not a theme
  roster.** The wordmark gains the Ψ glyph as an **inline SVG component** —
  not a `public/` asset — with `fill="currentColor"`. Inline costs no extra
  request, and `currentColor` means the mark follows the resolved theme,
  including any console-generated one. A hardcoded fill would be the single
  place on the page that ignores the theme the hero just derived. If a drawn
  asset replaces the glyph later, it inherits the same constraint.

  The switcher drops from a four-theme roster (`light | dark | acme | ember`)
  to a **binary light/dark toggle**. There is no `system` option: the theme
  *chooser* — the thing that selects among brands — is moving to the Theming
  section, and eventually to a page of its own. The header stops being a
  showcase and becomes an appearance control.

  **First visit still follows the OS.** `index.html` today reads
  `stored || (prefers-color-scheme: dark ? "dark" : "light")`, and that
  behaviour is kept: a dark-mode visitor is not flashed a light page. The
  absence of a `system` *option* is a UI decision, not a reason to ignore the
  OS for the initial value. Once the visitor toggles, their choice sticks.

- **Mode and brand are orthogonal, and stored separately.** The page has two
  independent axes, and the earlier draft of this spec tangled them:

  | Key | Holds | Absent means |
  | --- | --- | --- |
  | `psi-theme` | `"light" \| "dark"` — which mode | first visit → OS preference |
  | `psi-brand` | a `BrandVector` — which brand | stock Psi |

  The applied theme is `brand ? derived[mode] : stock[mode]`. The header writes
  only the first key; the console writes only the second. They cannot contend,
  because neither is expressible in the other's key.

  **A note on what this replaced.** An earlier draft introduced a
  `psi-appearance` key to hold a three-way `light | dark | system`, because
  `"system"` is not a `ThemeName` and writing it to `data-psi-theme` would
  match no theme CSS and render the page unstyled. Dropping `system` dissolves
  that trap entirely — `"light"` and `"dark"` *are* valid theme names, so the
  existing key needs no rename and no migration.

  One migration concern survives: a returning visitor holds
  `psi-theme: "ember"` or `"acme"` from the old roster, which the header can no
  longer represent. The boot script therefore **validates the stored value
  against `light | dark`** and falls through to the OS preference otherwise,
  rather than stranding that visitor in a theme with no control for leaving it.

- **The toggle selects a member; it never re-derives.** Because a brand is
  derived as a light/dark pair (see Design), switching mode while a console
  theme is active swaps to the pair's other member — instant, and identical to
  what a reload would produce. Deriving sets the mode to `vector.mode`, so a
  prompt reading *midnight* lands the visitor in dark without a second click.

  An earlier draft had the toggle re-derive at a new `base`. Pair generation
  replaces it: there is nothing to recompute, and the two storage keys are
  orthogonal, so the header and the console cannot contend for the same state.
  Reset remains the only control that discards a brand.

- **`themes/light.ts` moves to the Theming section.** The hero's formula card
  splits in two, and the halves go to different places:

  - the Δ-lightness **swatches** fold into the console, now driven by the
    derived accent (see Design, above);
  - the `themes/light.ts` → `--psi-fg-accent` **source listing** relocates to
    the Theming section, beside the existing `customers/acme.ts` snippet.

  Both are theme *source* artifacts written in the same DSL — one shipped, one
  branded. The section already argues "a customer is a theme file, not a fork";
  showing the default theme's formula next to a customer's palette completes
  that argument instead of splitting it across two screens.

- **The site gate's storage key must move in lockstep.**
  `apps/promo/site-gate/site.spec.ts:20` seeds
  `localStorage.setItem("psi-theme", theme)` to run axe under light and dark.
  Renaming the key without updating the test **does not fail** — axe simply
  runs twice against the same default appearance, and the dark-mode pass is
  lost silently. The test therefore also asserts the resolved
  `data-psi-theme` after load, so that a future key change fails loudly
  instead of quietly halving the gate's coverage.

- **The hero rebuild inherits a D76 invariant.** `site.spec.ts` asserts the
  hero's derive labels clear AA at both Δ-slider extremes, and records why:
  the labels once sat *on* the accent swatches and measured 4.38:1 at rest,
  2.88:1 at maximum — a contrast demo that failed contrast. The console's
  derived-state row reuses those swatches, so **its labels sit on the panel,
  never on a swatch.** The test carries forward to the new markup rather than
  being rewritten around it.

## Architecture

| Unit | Location | Depends on |
| --- | --- | --- |
| `parsePrompt`, dictionaries, font catalog | `packages/tokens/src/generate/` | nothing |
| `deriveTheme`, `solveL` | `packages/tokens/src/generate/` | `contrast-matrix.ts`, `dsl/` |
| `serializeCustomerTheme` | `packages/tokens/src/generate/` | `dsl/` types, `scripts/new-theme.ts` template shape |
| `/api/theme` | `api/theme.ts` | `generate/` types, AI Gateway |
| Console UI | `apps/promo/src/sections/Hero.tsx` | `@handamade/psi-tokens` |

`generate/` is pure and dependency-free, matching the package's zero-runtime-
dependency contract, and is imported unchanged by the browser, the Function,
and any future CLI. `api/theme.ts` is a sibling of the existing `api/mcp.ts`;
`vercel.json` already deploys Functions from `api/`, and `apps/promo` already
serves at `/` via `tools/assemble-site.mjs`, so `/api/theme` needs no rewrite
and no new infrastructure category.

## Non-goals

- **No change to `pnpm new-theme`.** The CLI already exists and already writes
  and registers `customers/<name>.ts`; it simply scaffolds placeholder anchors
  rather than derived ones. Giving it a `--prompt` flag over `generate/` is the
  natural sequel and is a separate spec. This one produces source in the
  browser, in the shape the CLI already emits.
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

**`ember` is between homes.** The header switcher is the only site-wide way to
see `ember` today — the Theming grid shows light, dark and acme, and nothing
else references it. Narrowing the header to a light/dark toggle removes that
surface before its replacement exists.

The destination is known rather than undecided: the theme *chooser* moves into
the Theming section, and later onto a page of its own. That relocation is the
Theming redesign's work, not the console's, so between this cycle and that one
a shipped, published theme has no representation on the public site. It remains
in the package, the resolved token output, and Storybook throughout.

Two consequences to carry into that cycle:

- the hero's `"4 themes"` stat stays **true** — the package still ships four —
  but becomes a claim the page no longer demonstrates;
- `Roadmap.tsx:6` describes those four as "light, dark and two customer brands
  (acme, ember)", which likewise stays true while becoming unillustrated.

Neither is drift for `check-docs-drift` to catch (it tracks component, icon and
pattern counts, not themes), so nothing will fail if this is forgotten. That is
exactly why it is written down.

Beyond that one rule, `apps/promo` is fully token-bound and needs no
preparation for whole-page theming: the stylesheet contains three colour
literals in total, all three `oklch(from var(--psi-fill-accent) …)`, and its
app-level custom properties derive from Psi tokens (`--promo-hairline` is
`color-mix(in oklab, var(--psi-fg-primary) 12%, transparent)`). A generated
theme therefore reaches the whole page rather than half of it.

## Verification

- **All five gates** — `pnpm build && node tools/check-docs-drift.mjs &&
  pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site`.
  `check-docs-drift` matters here: the Theming section's prose changes, the
  hero is rebuilt, and a section moves. `test:site` (D76) covers `apps/promo`
  and needs `apps/promo/dist` to exist first.
- **Unit** — `parsePrompt` determinism (same prompt → same vector; unknown
  words still derive); `solveL` convergence against `checkContrast` across the
  hue circle in **both** members of a derived pair; `serializeCustomerTheme`
  output parses as
  valid TypeScript matching the `CustomerTheme` shape **and matches the shape
  `scripts/new-theme.ts` emits**, so the browser and the CLI cannot drift into
  two file formats.
- **The pinned-demo test** — a generated theme applied to `documentElement`
  must not alter the three `data-psi-theme` cards in the Theming section.
- **Contract** — `/api/theme` responses failing `BrandVector` validation are
  rejected and the local derivation stands; a timeout, a non-2xx and an absent
  API key each leave a fully working console.
- **Mode** — a first visit with no stored value follows
  `prefers-color-scheme`; once toggled, the stored choice wins over the OS. A
  stale `psi-theme` of `"ember"` or `"acme"` from the old roster falls through
  to the OS preference rather than stranding the visitor in a theme the header
  cannot leave.
- **Pair** — one prompt yields two themes, **both** clearing the AA matrix;
  the brand's hue and chroma are identical across the pair while the lightness
  anchors invert. A prompt implying dark (*midnight*) lands in dark on derive.
- **Composition** — with a console theme active, toggling mode swaps to the
  pair's other member and keeps the brand; the result is identical to
  reloading in that mode. Only reset discards the brand, and it leaves the
  mode untouched.
- **Site gate** — the axe runs assert the resolved `data-psi-theme` rather
  than trusting the seeded storage key, so both appearances are provably
  covered.
- **Reset and recovery** — the explicitly hostile cases, because this is what
  the whole-page decision rests on:
  - a hand-corrupted stored vector, a vector with an off-scale `radius`, and a
    non-JSON value each boot to the default theme with the key cleared, not to
    a broken page;
  - a stale cache disagreeing with its vector heals on load rather than
    persisting the old output;
  - reset clears the theme and its storage, keeps appearance and prompt, and
    a reload after reset stays reset.
- **Browser** — derive with the remote stage unconfigured (local path), then
  configured; confirm restore-before-paint on reload, and reset. Confirm the
  Ψ mark follows a generated theme (it must never keep the pre-derive
  colour).
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
Psi's own design decisions. "Impressive" and "on-message" are in genuine
tension here, and the trade is accepted for the hero demo.

It is only defensible because recovery is structural rather than a button:
`solveL` means every theme that can reach the screen is readable, and
persisting the `BrandVector` rather than resolved tokens means every theme
that can reach the screen came from `solveL`. Those two together are what
make the reset control guaranteed legible. **If a later change persists
resolved output instead — for speed, say — this justification collapses and
the whole-page decision should be revisited with it.**
