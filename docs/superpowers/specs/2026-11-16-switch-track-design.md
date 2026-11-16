# A switch you can find (D122)

Date: 2026-11-16. Status: **Approved**, branch `d122-switch-track`.

Provenance: the other follow-up D106 left open ("the Switch track"), and the
one D120 deliberately kept out of its PR so each PR's vr baselines stay
explainable. WCAG 1.4.11 (Non-text Contrast) asks for 3:1 for the visual
information that identifies a control and its state. An unchecked Switch is
identified by its track alone, and its state by where the thumb sits on it.

The number was allocated by the coordinating session and checked against
every `## Decisions` entry on `origin/main` and the branches in flight. D119
and D121 are held by other branches.

## What's there today

Measured on 0.30.0 + D120, from `dist/resolved/<theme>.json`, with alpha
composited onto the surface:

| Theme | `fillNeutral4` (unchecked track) on bgPrimary / bgSecondary | white thumb on that track | `fillAccent` (checked track) on bgPrimary / bgSecondary | white thumb on `fillAccent` |
| --- | --- | --- | --- | --- |
| light | 1.11 / 1.21 | 1.28 | 4.35 / 4.75 | 5.02 |
| dark | 1.27 / 1.16 | 15.50 | 3.91 / 3.59 | 5.02 |
| acme | 1.10 / 1.20 | 1.24 | 4.77 / 5.20 | 5.36 |
| ember | 1.27 / 1.25 | 15.52 | 7.55 / 7.40 | **2.62** |

1. **Every theme fails 3:1 for the unchecked track, by about two thirds.**
   `--psi-switch-track-bg` binds `--psi-fill-neutral4`, a surface one step
   off the canvas. In the light themes the white thumb also all but vanishes
   into it. Only its drop shadow marks it.
2. **`fillNeutral4` cannot be retuned.** Four other component vars bind it,
   none of which identifies a control: Button `ghost-bg-active`, Menu
   `item-bg-active`, NavTree `item-bg-current` and Skeleton `bg`. It is also
   a gated *text* surface: `fgPrimary` and `fgSecondary` must reach 4.5 on it
   (`wcagAAPairs`). A fill dark enough for 3:1 against the canvas would break
   `fgSecondary` on it.
3. **The checked track passes in every theme, but nothing gates it.**
   `fillAccent` is not in `nonTextPairs`.
4. **Ember's white thumb on its orange checked track is 2.62.** Ember
   overrides `fgOnAccent` for labels, but the thumb binds `fillStaticWhite`.
5. **The Switch has no hover state.** Checkbox and Radio have none either.
6. **A fixed alpha of `fgPrimary` solves both unchecked constraints.** At
   `borderControl`'s own alphas (0.55 light, 0.40 dark) the track clears 3:1
   on both surfaces, and the white thumb clears 3:1 on the track, in all
   four themes. `fgPrimary` is a fixed lightness in both bases, so a derived
   theme only moves its hue and chroma.

## Decisions

- **D122 — the unchecked Switch track is a new gated surface, `fillControl`,
  with a gated hover step, `fillControlHover`.**
  - **Rest: `fillControl` is a `ref` to `borderControl`, scoped to
    surfaces.** It carries `borderControl`'s alpha (0.55 light, 0.40 dark),
    so the unchecked track and the unchecked checkbox's outline are always
    the same ink, and a theme that overrides `borderControl` moves both. It
    is emitted as `--psi-fill-control` and bound by
    `--psi-switch-track-bg`. It is a new token, not a scope added to
    `borderControl`, because a component `-bg` var may only bind a
    surface-scoped semantic (D46), and widening `borderControl`'s scope
    would let every component's `-bg` bind a border.
  - **Hover: `fillControlHover` is `fgPrimary` at alpha 0.75 in the light
    base and 0.55 in the dark base**, scoped to surfaces. It is emitted as
    `--psi-fill-control-hover` and bound by a new
    `--psi-switch-track-bg-hover`. Hover applies only to an enabled,
    unchecked switch whose label is under the pointer. The checked track and
    the thumb do not change on hover. More ink is a step darker in the light
    themes and a step lighter in the dark ones. The dark alpha is 0.55, not
    D120's 0.60, because at 0.60 the white thumb on the track measures
    3.04–3.22, too little room for a derived theme.

    | Theme | track vs surface, rest / hover (worst of bgPrimary, bgSecondary) | white thumb on track, rest / hover (on bgPrimary) |
    | --- | --- | --- |
    | light | 3.24 / 5.63 | 3.74 / 6.50 |
    | acme | 3.29 / 5.81 | 3.71 / 6.54 |
    | dark | 3.29 / 5.18 | 5.97 / 3.72 |
    | ember | 3.41 / 5.52 | 5.80 / 3.56 |

  - **`nonTextPairs` gains six pairs at 3:1:**
    - `fillControl` and `fillControlHover` on `bgPrimary` and `bgSecondary`
      (the track identifies the control);
    - `fillStaticWhite` on `fillControl` and on `fillControlHover` (the
      thumb's position on the track carries the state). `checkContrast`
      composites an alpha background onto `bgPrimary`. The same pairs over
      `bgSecondary` measured 3.47 or better and are not gated: that would
      take an API change to `checkContrast` for a case no shipped theme is
      near.

    They join everywhere the gate runs: `gateTheme` (Psi's build and a
    consumer's `buildThemeCss`) and `deriveTheme`'s `AA_MATRIX` and full
    360×5×2 sweep (40 → 46 pairs). Like `borderControl`, the derive loop does
    not tune them. The sweep proves the alphas hold.
  - **Unchanged:**
    - the checked track (`fillAccent`) and its thumb;
    - focus (the outline in `--psi-switch-focus-ring`);
    - disabled (opacity 0.4; an inactive control is exempt from 1.4.11);
    - `fillNeutral4` and its four other bindings.

  **What this changes.** Every unchecked Switch, in every theme, draws a
  mid-grey track that a white thumb sits clearly on, and it gains a hover.
  A consumer theme built with `buildThemeCss` is now also held to the six
  pairs. A theme that changes only its palette clears them whenever it
  clears `borderControl`. A theme that overrides `borderControl` moves the
  track with it. A theme that overrides `fillControlHover` should keep it a
  step beyond `fillControl`: the gate checks each at 3:1, not their order. A
  consumer that set `--psi-switch-track-bg` by override keeps its override.

  Weighed and not taken:

  - **Retune `fillNeutral4`.** It would darken four unrelated active and
    loading surfaces and break the AA text pairs it carries.
  - **An outlined track (`borderControl` ring) with a dark unchecked thumb.**
    This is the Material 3 / Fluent pattern. It needs new thumb and border
    vars and CSS for each state, and the dark thumb on a near-canvas fill
    needs its own pair. Shown to the user beside the solid track, which was
    chosen.
  - **Gate the checked track and fix Ember's thumb here.** Both are the same
    class of defect but a different token (`fillAccent`) and a derive risk:
    a light accent from a prompt can fail 3:1 against a light canvas.
    Recorded as follow-ups.
  - **No hover.** Zero new hover tokens, but the user asked for a hover cue.

## Consequences

- The unchecked Switch clears 3:1 against its surface, and its thumb clears
  3:1 against it, at rest and on hover, in every shipped and derivable
  theme.
- `nonTextPairs` gates ten pairs, and the full matrix is 46.
- `--psi-fill-control` means "the fill that identifies an unchecked
  control", the surface twin of `--psi-border-control`.
- Follow-ups, not taken here:
  - gate the checked Switch track (`fillAccent` on bgPrimary and
    bgSecondary) and its thumb;
  - Ember's white thumb on its accent track (2.62).

## Verification

- **Tests first**, red before the change and red on the assertion, in
  `packages/tokens/__tests__/switch-track.test.ts`:
  - The light and dark bases define `fillControl` as a ref to
    `borderControl`, and `fillControlHover` from `fgPrimary` at 0.75 and
    0.55, both scoped to surfaces.
  - `nonTextPairs` contains the six pairs.
  - light, dark, acme and ember clear all six, and hover is further from
    the surface than rest on both surfaces.
  - `gateTheme` refuses a theme whose `fillControl` is `fgPrimary` at alpha
    0.15 with a `ThemeGateError` naming `fillControl on bgPrimary` and
    `fillControl on bgSecondary`. The `buildThemeCss` path runs the same
    function.
  - `--psi-switch-track-bg` binds `--psi-fill-control`, and
    `--psi-switch-track-bg-hover` binds `--psi-fill-control-hover`.
- `field-border.test.ts`: its "`nonTextPairs` is exactly the four pairs"
  becomes a containment check, as D120 did to D106's.
- `generate-derive.test.ts`: 40 → 46 pairs, in its prompts and in the full
  sweep. Same in the `derive.ts` comment.
- `packages/tokens/llms.txt` names `--psi-fill-control`,
  `--psi-fill-control-hover` and the Switch binding.
- All five gates. CI's `vr` renders for every Switch story and the Color
  Tokens stories replace their baselines, only after the user's OK on
  before/after pairs.
