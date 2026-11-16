# A field you can find (D120)

Date: 2026-11-16. Status: **Approved**, branch `d120-field-border`.

Provenance: the follow-up D106 left open ("field borders (Input, Select,
Textarea)"). A consumer documents the same gap: its field border on
`bgPrimary` is unchecked. WCAG 1.4.11 (Non-text Contrast) asks for 3:1 for
the visual information that identifies a control. A text field's border is
the only edge it has against the surface it sits on, because its fill is
`bgPrimary`, the canvas itself.

The number was allocated by the coordinating session and checked against
every `## Decisions` entry on `origin/main` at `20979dd`. D119 is reserved
for another branch in flight.

## What's there today

Measured on 0.29.0 + D118, from `dist/resolved/<theme>.json`, with alpha
composited onto the surface:

| Theme | `borderNeutral` (rest) on bgPrimary / bgSecondary | `borderStrong` (hover) on bgPrimary / bgSecondary |
| --- | --- | --- |
| light | 1.32 / 1.32 | 1.79 / 1.81 |
| dark | 1.41 / 1.48 | 2.34 / 2.43 |
| acme | 1.32 / 1.33 | 1.79 / 1.81 |
| ember | 1.42 / 1.46 | 2.39 / 2.43 |

1. **Every theme fails 3:1, by more than half, at rest and on hover.**
   `--psi-{input,select,textarea}-border` bind `--psi-border-neutral`
   (`fgPrimary` at alpha 0.15). Their `-border-hover` binds
   `--psi-border-strong` (alpha 0.30).
2. **The gated control border already exists.** `borderControl` (D106) is
   3.24–3.45 on both surfaces and is gated in `nonTextPairs`. Only the
   checkbox box and the radio circle bind it.
3. **`borderNeutral` has one other bound use in Psi:** InlineAlert's
   neutral variant, where the border is decorative. Card, Table and the
   dividers do not bind it. It is a public token, though, and consumers
   bind it for their own decorative edges.
4. **`borderStrong` has one other bound use:** the Button `outline`
   variant's border. That button is identified by its label, so its border
   is not information 1.4.11 requires.
5. **Rebinding the rest border alone inverts hover.** At rest
   `borderControl` is alpha 0.55 (light) and 0.40 (dark). A hover in
   `borderStrong` (0.30) would make the field lighter under the pointer.
   And a component `-border` var may only bind a border-scoped semantic
   (scope gate, D46), so `fgSecondary` is not available.

## Decisions

- **D120 — fields draw their border in `borderControl`, with a new gated
  `borderControlHover` for hover.**
  - **Rest: `--psi-{input,select,textarea}-border` bind
    `var(--psi-border-control)`.** Fields and the unchecked checkbox and radio
    now share one control edge. The pairs that gate it already exist, so this
    adds no rest pair.
  - **Hover: a new semantic, `borderControlHover`, is `fgPrimary` at alpha
    0.75 in the light base and 0.60 in the dark base**, scoped to borders.
    It uses the same alpha-of-ink recipe as every other border. Brand
    themes inherit it through their base. Emitted as
    `--psi-border-control-hover`, and bound by
    `--psi-{input,select,textarea}-border-hover`. The alphas keep hover a
    visible step darker than rest in every theme:

    | Theme | rest (`borderControl`) | hover (`borderControlHover`) |
    | --- | --- | --- |
    | light | 3.24 | 5.63 |
    | acme | 3.29 | 5.81 |
    | dark | 3.29 | 5.90 |
    | ember | 3.41 | 6.36 |

    (Worst of bgPrimary / bgSecondary. A softer step, 0.65 / 0.50, worst
    4.23, was offered and not taken.)
  - **`nonTextPairs` gains `borderControlHover` on `bgPrimary` and
    `bgSecondary` at 3:1** (four pairs). 1.4.11 covers a control's states as
    well as its rest. Gating the hover means no theme can make hover the
    state that fails. The pairs join everywhere the gate runs:
    - `gateTheme`, which is both Psi's build and a consumer's
      `buildThemeCss`;
    - `deriveTheme`'s `AA_MATRIX` and its full sweep (38 → 40 pairs).

    Like `borderControl`, the derive loop does not tune it. The sweep proves
    the alpha holds.
  - **Unchanged:**
    - focus (the inset `border-focus` ring, D82, which replaces the border);
    - error (`fg-danger`, gated at 4.5 on bgPrimary);
    - disabled (opacity 0.4; an inactive control is exempt from 1.4.11);
    - `borderNeutral` (InlineAlert, consumers);
    - `borderStrong` (Button outline), which stays out of the gate.

  **What this changes.** Every Input, Select and Textarea, in every theme,
  draws a visibly darker edge at rest and a darker one again on hover. A
  consumer theme built with `buildThemeCss` is now also held to
  `borderControlHover` at 3:1. Any theme that clears `borderControl` clears
  it, because it is a higher alpha of the same ink. A consumer that set
  `--psi-input-border` (or the select or textarea one) by override keeps
  its override.

  Weighed and not taken:

  - **Raise `borderNeutral`.** It fixes the fields without a rebind. But it
    darkens InlineAlert's decorative border and every consumer's decorative
    use of the token. It also leaves Psi without a quiet border between
    `borderFaint` and `borderControl`.
  - **A field-specific token (`borderField`).** It lets fields tune their
    edge apart from the checkbox. But it adds a second public token and two
    more pairs for an edge that means the same thing: this is a control.
  - **Hover stays at rest (no hover change).** Zero new tokens, but it
    drops the hover cue fields have today.
  - **Raise `borderStrong` and gate it.** It would also darken the Button
    outline border, which is outside this request.
  - **Include the Switch track.** It is the other D106 follow-up and the
    same kind of defect. But it is a fill, not a border, and wants its own
    pair, its own decision and its own moved baselines.

## Consequences

- Input, Select and Textarea clear 3:1 at rest and on hover in every
  shipped and derivable theme.
- `nonTextPairs` gates four pairs, and the full matrix is 40.
- `--psi-border-control` now means "the edge that identifies a control",
  for fields as well as checkboxes and radios.
- Follow-up, not taken here: the Switch track at 3:1 against its surface.

## Verification

- **Tests first**, red before the change and red on the assertion, in
  `packages/tokens/__tests__/field-border.test.ts`:
  - The light and dark bases define `borderControlHover` from `fgPrimary` at
    0.75 and 0.60, scoped to borders.
  - `nonTextPairs` is exactly the four pairs.
  - light, dark and acme clear `borderControlHover` at 3:1 on both surfaces,
    and it is darker than `borderControl` (a higher ratio) on each.
  - `gateTheme` refuses a theme whose `borderControlHover` is at alpha 0.15
    with a `ThemeGateError` naming exactly
    `borderControlHover/bgPrimary` and `borderControlHover/bgSecondary`.
    The `buildThemeCss` path runs the same function.
  - Input, Select and Textarea bind `--psi-border-control` and
    `--psi-border-control-hover`.
- `control-border.test.ts`:
  - its `nonTextPairs` assertion becomes a containment check for D106's
    two pairs;
  - "and by no field" becomes the opposite.
- `generate-derive.test.ts`: 38 → 40 pairs, in its prompts and in the full
  sweep.
- `packages/tokens/llms.txt` names `--psi-border-control-hover` and the
  field binding.
- All five gates. CI's `vr` renders for every story with a field replace
  their baselines, and only after the user's OK on a sample.
