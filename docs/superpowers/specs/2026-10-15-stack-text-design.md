# A column and a line of text for pattern trees (D109)

Date: 2026-10-15. Status: **Implemented** on branch `d109-stack-text`.

Provenance: the UI polish triage after 0.26.0 (candidate B.1). The two pattern
presets rooted in `Panel` render with no layout. The user picked this shape
(Stack + Text) over a `Panel` gap prop and over an `EmptyState` component.

The number is the first free `## Decisions` entry when this branch started.
D105 to D108 are claimed by their PRs (#143 and #144 merged, #145, #146).

## What's there today

1. **Two presets are rooted in `Panel`:** `empty-state` and `feedback-form`.
   `Panel` sets padding but no layout, so its children flow as they come:
   `feedback-form`'s two Fields and its button stack flush, with no gap.
2. **A compose tree can name only manifest components.** Its strings are
   bare text nodes. `empty-state`'s headline and explanation are two adjacent
   strings, so they render as one run, `[nothing matches these filters][say
   whether…]`, followed on the same line by the button. A flex or grid `Panel`
   would not separate them: contiguous text becomes one anonymous item.
3. **No utility gives a tree a layout context.** `psi-gap-*` sets `gap` only,
   and guidance.json says to pair it with flex or grid yourself, which a
   compose tree cannot do.
4. **The house rule** admits a new component when a pattern demands it. Both
   presets demand a column; `empty-state` also demands a text element.

## Decisions

- **D109 — two components. `Stack` lays its children out in a column with a
  gap from the space scale. `Text` puts a line of text in its own element at
  one of Psi's text styles.**
  - **`Stack`:** a `<div>` with no role. `gap?: 4 | 8 | 12 | 16 | 24 | 32`
    (default 16). `align?: "stretch" | "start" | "center" | "end"` (default
    `"stretch"`, flexbox's own default). Host props pass through. No tokens:
    it binds only the space scale. It is `Toolbar`'s column counterpart, but
    `Toolbar` wraps a row; `Stack` never wraps.
  - **`Text`:** `as?: "p" | "span" | "div" | "h2" | "h3" | "h4"` (default
    `"p"`), `size?: 12 | 14 | 16 | 18` (default 14), `weight?: "regular" |
    "medium"` (default regular), `tone?: "primary" | "secondary"` (default
    primary). Each size/weight is an existing `--psi-text-{size}-{line}-{weight}`
    style. Margin 0, so a `Stack`'s gap is the only spacing. Tokens
    `--psi-text-fg` and `--psi-text-fg-secondary` alias `fgPrimary` and
    `fgSecondary`, both gated at 4.5 on every surface: no new pair.
  - **`as` is separate from `size`.** A heading's level follows the document
    outline, its size the design. `Text as="h3" size={16}` is legal and
    common.
  - **The presets:**
    - `empty-state`: `Panel` > `Stack gap={8} align="start"` > `Text as="h3"
      size={16} weight="medium"` (headline), `Text tone="secondary"`
      (explanation), `Button`.
    - `feedback-form`: `Panel` > `Stack gap={24}` > the two Fields and a
      `Toolbar` holding the button. 24 is the field spacing `llms.txt` already
      prescribes (`psi-gap-24` between fields). The Stack stretches, so the
      fields are full width; the Toolbar row keeps the button at its own
      width. The first version used `align="start"`, and CI's render showed
      it shrank the Description Field and its Textarea to their content; the
      interaction spec now checks the Textarea fills the column.

  **What this changes.** Two new components (catalog 50 → 52) and the two
  presets' trees. `Panel` is unchanged, so no Panel story moves.

  Weighed and not taken:

  - **A `gap` prop on `Panel`.** One new component instead of two, but
    `Dialog`'s body and `Card` would each want the same prop next.
  - **An `EmptyState` component.** It fits one preset and leaves
    `feedback-form` without layout.
  - **Wrapping strings in elements automatically** (in the compose renderer).
    The tree would render elements the manifest does not describe.

## Consequences

- A compose tree can lay out a column and set text, so the next preset that
  needs either does not need a decision.
- Pinned lists move on purpose: the manifest's component list,
  `slots.test.ts`'s names, and the docs' component counts.

## Verification

- **Tests first**, red before the change, on assertion, against stubs:
  - `Stack.test.tsx`: a div with no role; the gap and align classes; host
    props and ref pass through; the module binds `--psi-space-*` for each gap.
  - `Text.test.tsx`: renders the `as` element; the size/weight class maps to
    the matching `--psi-text-*` style; tone binds `--psi-text-fg-secondary`;
    margin 0.
  - `packages/tokens/__tests__/text-tokens.test.ts`: both keys alias the
    gated semantics; registered.
  - `patterns.test.ts` or the preset tests: `empty-state` and `feedback-form`
    compose a `Stack` with the gaps above, and `empty-state` puts its headline
    and explanation in `Text`.
  - Axe: a Stack of Texts with a heading passes.
- **`stack-text.interaction.spec.ts` (`@interaction`)**: in Chromium, the
  `empty-state` preset's headline, explanation and button are three rows 8px
  apart, and the `feedback-form` preset's Fields and button are 24px apart.
- VR: the two presets move (light, ember), and the new Stack and Text stories
  get baselines, each explained in the PR.
