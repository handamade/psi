# A checkbox and radio you can find (D106)

Date: 2026-10-15. Status: **Implemented** on branch `d106-control-border`.

Provenance: the UI polish triage after 0.26.0 (candidate B.3). In the VR renders
of `Checkbox` and `RadioGroup`, an unchecked box or circle was hard to see.
WCAG 1.4.11 (Non-text Contrast) asks for 3:1 against adjacent colours for the
visual information needed to identify a control. For an unchecked checkbox or
radio, the outline is the only thing that identifies it.

The number is the first free `## Decisions` entry when this branch started.
D105 is claimed by its open PR (#143).

## What's there today

Measured against `dist/resolved/<theme>.json`, with the alpha composited
onto the surface it sits on:

| Theme | `borderNeutral` on bgPrimary / bgSecondary | `borderStrong` on bgPrimary / bgSecondary |
| --- | --- | --- |
| light | 1.32 / 1.32 | 1.79 / 1.81 |
| dark | 1.41 / 1.48 | 2.34 / 2.43 |
| acme | 1.32 / 1.33 | 1.79 / 1.81 |
| ember | 1.42 / 1.46 | 2.39 / 2.43 |

1. **Every theme fails 3:1, by half.** `--psi-checkbox-box-border` and
   `--psi-radio-group-circle-border` bind `--psi-border-neutral`, which is
   `fgPrimary` at alpha 0.15.
2. **No existing border clears it.** `borderStrong` (alpha 0.3) reaches 2.43 at
   best.
3. **`borderNeutral` is a decorative border elsewhere.** Input, Select, Textarea
   and InlineAlert bind it too. Raising it would move every one of them.
4. **The matrix gates no non-text pair.** Every gated pair is text at 4.5:1.

## Decisions

- **D106 — a new semantic border, `borderControl`, at 3:1 or better, gated, and
  bound by the checkbox box and the radio circle.**
  - **`borderControl` is `fgPrimary` at alpha 0.55 in the light base and 0.40
    in the dark base,** the same alpha-of-ink recipe as the other borders.
    Brand themes inherit it through their base. The alphas were chosen by
    sweep, with headroom over 3:1 and no more:

    | alpha (light base) | 0.50 | **0.55** | 0.60 |
    | --- | --- | --- | --- |
    | worst shipped (light, acme) | 2.84 | **3.24** | 3.68 |
    | worst derived (360 hues x 5 chromas) | 2.82 | **3.22** | 3.67 |

    | alpha (dark base) | 0.35 | **0.40** | 0.45 |
    | --- | --- | --- | --- |
    | worst shipped (dark, ember) | 2.78 | **3.29** | 3.88 |
    | worst derived | 2.76 | **3.26** | 3.85 |

  - **A new gated list, `nonTextPairs`, at 3:1:** `borderControl` on
    `bgPrimary` (the box's own fill and the canvas) and on `bgSecondary` (the
    surface of Panel, Dialog and Menu). It joins the gate everywhere the gate
    runs: `gateTheme` (Psi's build and `buildThemeCss`), and `deriveTheme`'s
    matrix with its full sweep. The derive loop cannot tune this token, so the
    sweep proves the alpha holds for every reachable theme rather than solving
    it.
  - **Bound by `--psi-checkbox-box-border` and `--psi-radio-group-circle-border`
    only.** The checked state already uses `fill-accent`, unchanged.

  **What this changes.** The unchecked checkbox box and radio circle, in every
  theme. A consumer theme built with `buildThemeCss` is now also held to
  `borderControl` at 3:1. A theme whose `fgPrimary` barely clears 4.5:1 on its
  canvas could fail it, and the gate names the pair.

  Weighed and not taken:

  - **Raise `borderNeutral`.** It is decorative on InlineAlert and sets the
    field borders. It would move far more than the controls this is about.
  - **Rebind to `borderStrong`.** Too faint (above), and it is the field hover
    border, so raising it moves every field's hover.
  - **Include Input, Select and Textarea now.** Their borders also measure
    1.32:1, and they are a 1.4.11 case too. But that moves about 25 more
    stories, and a field also reads as a field by its fill and its label. A
    separate decision, so that each PR's moved baselines stay explainable.
  - **Include the Switch track.** `fillNeutral4` on the surface measures
    1.10–1.27. It is a fill, not a border, and wants its own pair and its own
    decision.

## Consequences

- Unchecked checkboxes and radios clear 3:1 in every shipped and derivable
  theme.
- The matrix has its first non-text pairs; future 1.4.11 fixes add to
  `nonTextPairs`.
- Follow-ups, not taken here: field borders (Input, Select, Textarea) and the
  Switch track.

## Verification

- **Tests first**, red before the change, on assertion, in
  `packages/tokens/__tests__/control-border.test.ts`:
  - The light and dark bases define `borderControl` from `fgPrimary` at 0.55
    and 0.40, scoped to borders.
  - `nonTextPairs` gates it on `bgPrimary` and `bgSecondary` at 3.
  - light, dark and acme clear it with headroom (3.1 or better).
  - `gateTheme` refuses a theme whose `borderControl` is at alpha 0.15, naming
    the pair.
  - The checkbox box and radio circle bind `--psi-border-control`; Input,
    Select and Textarea still bind `--psi-border-neutral`.
- `generate-derive.test.ts` gates the new pairs in its prompts and in the full
  sweep (38 pairs).
- VR: CI's renders for every story with an unchecked checkbox or radio
  replace their baselines, each one explained in the PR.
