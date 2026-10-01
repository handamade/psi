# A labelled filter form: `Toolbar` gains `align` and `as`, `Input` becomes pixel-true, pattern `filter-form` (D87)

Date: 2026-10-01. Status: **Implemented** on branch `d87-filter-form`.

Provenance: the sixth item of the Psi 0.21 portal handoff
(`docs/superpowers/plans/2026-09-30-psi-0.21-portal-handoff.md`, brief D87,
and the two open questions in `2026-09-30-psi-0.21-handoff-2.md` §5). The
portal's filters are a form above the table, with visible labels, submitted
with a *Find* button (rule 7), and every control carries visible text
(rule 4).

## What's there today

Measured in Chromium 149 against the built Storybook, at 1366 × 768, before
anything was written.

1. **`filter-toolbar` names its controls by `aria-label` and placeholder.**
   Its accessibility tree is `searchbox "Search transactions"`,
   `combobox "Category"`, and a tag — no visible label, on purpose; its
   `intent` says so. Rule 4 forbids it for the portal.
2. **`Toolbar` has only `gap`** (`Toolbar.tsx`), and centres its items
   (`align-items: center`). A `Field` is a label, a gap and a control; a
   `Button` is the control alone. Centred, they do not share a control line:
   - **this already ships**, in D85's `cursor-pagination` preset: the
     page-size `Select` spans 58–90 px and the pager's buttons 45–77 px — a
     13 px step between two controls that sit side by side;
   - a prototype row of `Field`s and a *Find* `Button`, injected into the
     same page, centred the button 13 px above the controls' centre line.
3. **`Input` is not the size it names.** `.input` sets `height` from the size
   token and `width: 100%`, but declares no `box-sizing`, so the browser's
   `content-box` applies: the border and the browser's own 1 px block
   padding are added outside the height.
   - Every `Input` story measures **4 px over its size**: 24 → 28, 32 → 36,
     40 → 44, 48 → 52. A date input measures 34 at size 32 (its block padding
     is 0).
   - Inside a `Field`, `width: 100%` plus padding and border overflows the
     field: the `date-range-filter` preset's date inputs are 159 px wide in a
     141 px `Field`.
   - `Select` and `Button` are the size they name (32 at 32): the browser's
     own stylesheet makes both `border-box`. So is `<input type="search">`,
     which is why `filter-toolbar`'s search box measured 32 and hid this.
   - With end-alignment and nothing else, a text `Input` beside a `Select`
     and a `Button` stands 4 px taller than both: the row's bottoms line up
     and its tops do not.
   - A consumer with a global `* { box-sizing: border-box }` reset never saw
     this; one without — Storybook, and any app that has none — did. Psi
     ships no reset, and its house rule is that sizes are pixel-true.
4. **A pattern's compose root must be a manifest component**, and `<form>`
   is not one. A preset that composes a `Toolbar` of fields and a submit
   button, with the `<form>` left to prose, renders a submit button outside
   a form: *Find* does nothing, and *Enter* in a field submits nothing.
5. **`Button` does not declare `type`.** It accepts it through
   `ButtonHTMLAttributes`, but the manifest does not list it, and the pattern
   validator rejects a prop the manifest does not list — so no preset can say
   `type="submit"`.
6. **A preset `Button` holds text or an icon, not both.** A node's `content`
   is one key, which D71 resolves either to an icon or to text, and `Button`
   has no `body` slot. *Find* with `IconSearch`, as the brief draws it, is
   not expressible in a pattern today.

## Decisions

- **D87 — A filter form is a `Toolbar` rendered as a named `<form>`, aligned
  on its controls' bottom edge, and `Input` is the size it names.**
  - **`Toolbar` gains `align?: "center" | "end"`**, default `center` (today's
    behaviour, no class). `end` adds a class that sets
    `align-items: flex-end`, so the controls under their labels and a
    button without one share their bottom edge.
    - End-alignment lines up the *last* line of each item. A `Field` in such
      a row must therefore end on its control: no description or error line
      under it. A hint belongs in the label. The prop's doc says so.
  - **`Toolbar` gains `as?: "div" | "form"`**, default `div`. This settles the
    first open question in favour of a real form, for three reasons:
    - a submit button outside a form is dead, and a preset is answerable for
      what it renders (D77) — an agent that copies the preset gets a working
      *Find*;
    - *Enter* in a text field submits a form, which is how a filter form is
      used from the keyboard; only a real `<form>` gives it;
    - the form carries the toolbar's `aria-label`, so it is a named `form`
      landmark. For that reason **`as="form"` sets no `role`**: today a
      labelled `Toolbar` forces `role="group"`, which on a `<form>` would
      erase the landmark. A labelled `div` stays a `group`, unchanged.
    - The alternative — the `Toolbar` alone, and the `<form>` described in
      the `intent` — is smaller, and leaves exactly the failure above to
      every consumer who reads the preset rather than the prose.
    - Props widen to `HTMLAttributes<HTMLElement>` and the ref to
      `Ref<HTMLDivElement | HTMLFormElement>`, as `Field` did for its
      fieldset (`group`). `onSubmit` is already an HTML attribute. React
      declares event handlers and callback refs bivariantly, so an existing
      `Ref<HTMLDivElement>` or div-typed handler still type-checks.
    - `as` over a boolean `form`: it names the element, which is what
      changes, and leaves room for a later value without a second flag.
  - **`Input` is `box-sizing: border-box`.** One declaration in `.input`.
    Every `Input` becomes the height its `size` names, and fills a `Field`
    without overflowing it. This is beyond the brief: without it, `align`
    lines up the row's bottoms and leaves a text field 4 px taller than the
    button beside it, which is the defect the brief exists to fix.
    - A consumer with a global reset sees nothing change. One without sees
      every text input 4 px shorter and exactly its size.
  - **`Button` declares `type?: "button" | "submit" | "reset"`**, as D60
    declares a prop so the manifest lists it (D85's `colSpan` did the same).
    No runtime change: it was already passed through, and with no `type` a
    button in a form is still a submit button, as the platform has it.
  - **New pattern `filter-form`**: a `Toolbar` with `as="form"`,
    `align="end"`, `gap={12}` and an `aria-label`, holding two `Field`s — a
    text `Input` and a `Select`, each with a visible label — and an `accent`
    `Button type="submit"` reading *Find*.
    - **The preset's *Find* carries no icon** (finding 6). An icon only
      reinforces text (rule 4), so the preset is complete without it; the
      `intent` names `IconSearch` as the one to add before the label. Giving
      a preset node text *and* an icon is a change to D71's renderer and
      validator, for one pattern — not this decision.
  - **The second open question — the two intents point at each other.**
    - `filter-toolbar`: filters that apply as they change, named by
      `aria-label`, no visible label — *"for filters with visible labels,
      submitted together with a Find button, use filter-form"*.
    - `filter-form`: labelled filters submitted together — *"for filters
      that apply as they change, named without a visible label, use
      filter-toolbar; never name a control by its placeholder alone"*.
    - The `guidance` rule that contrasts `filter-toolbar` with a labelled
      row names `filter-form` too.
  - **`cursor-pagination` gains `align="end"`** (finding 2). It is D85's
    pattern, unreleased, and it shows the 13 px step today; the fix is this
    decision's prop. `date-range-filter` holds two `Field`s of one height and
    stays centred.
  - **Not done:** `filter-toolbar` is unchanged. `Select` and `Button` keep
    the browser's `border-box` rather than declaring it; both measured true.
    No token: `align` is layout, and `Toolbar` has one token already.
  - **Counts:** 41 components, **21 patterns**. The MCP overview envelope
    (D61) holds through 23; `store.test.ts` drops its one synthetic pattern
    to keep the same edge under test.

## Verification

- **Tests first**, each red before its change:
  - `Toolbar`: 3 tests red on assertion — `align="end"` sets the end class
    while the default and `center` set none; `as="form"` renders a `form`
    landmark named by `aria-label` with no `role`; `onSubmit` fires once and
    a ref reaches the `HTMLFormElement`. The fourth, a labelled `div` still a
    `group`, passed before and after: it is the regression guard.
  - `Input`: red on assertion — the `.input` rule declares
    `box-sizing: border-box`, read from the CSS since jsdom does no layout.
  - **in a browser**, `filter-form.interaction.spec.ts`, all 4 red against
    `main`'s build: sizes measured `[28, 36, 44, 52]` for `[24, 32, 40, 48]`;
    the `filter-form` preset missing (two tests); the `cursor-pagination`
    pager's bottom at 77 against the select's 90.
  - the patterns: the seed and emit lists name `filter-form`; the D61
    envelope test runs 21 real patterns and no synthetic one.
- **Regression.** No existing `Toolbar`, `Input` or `Button` test edited.
- **In a browser** (Chromium 149, built Storybook, 1366 × 768), after:
  - the `filter-form` preset reads `form "Filters"` → `textbox` and
    `combobox`, each named by its visible label → `button "Find"`;
  - every control in it spans 58–90 px, in light and ember; so do the
    `cursor-pagination` preset's select and pager, and the `FilterForm`
    story's *Find* with `IconSearch`;
  - text inputs fill their `Field`: 172 in 172, and the `date-range-filter`
    preset's date inputs 141 in 141 (159 in 141 before);
  - the `AlignEnd` story shows the step it removes: centred, the button
    spans 45–77 beside a control at 58–90.
- **axe:** one new case, `Toolbar` as a filter form; no violations.
- **The six gates** green: 2437 tests in 103 files; docs drift at 41
  components and 21 patterns; site gate 9 of 9; `pnpm test:e2e` 189 of 189,
  the D82 focus sweep over the new stories included. No `-darwin` snapshot
  written.

## Consequences

- **Visual regression.** New: the `filter-form` preset and the `Toolbar`
  stories `FilterForm` and `AlignEnd` — 3 stories, 6 baselines, in light
  and ember. Changed: the 12 stories that render a
  `content-box` `Input` (counted in the browser: `Input` ×5, `Field` ×2,
  `Toolbar` ×2, `Dialog` form, the `date-range-filter` and `required-field`
  presets) and the `cursor-pagination` preset — 13 stories, 26 baselines,
  from CI's actual renders.
- **Measured in CI (run 36830883884): exactly those 32 failed**, and the
  artifact's snapshot folder differed from the committed one by the 6 new
  files alone. Each changed render was checked against its baseline: inputs
  4 px shorter and no wider than their `Field`, what follows them moved up by
  4 px per input, the pager moved down onto the select's line.
  - **One difference was not D87's**: in every changed story with a `Select`,
    the chevron is darker than in the committed baseline. D81 redrew the
    chevron with gradients (2026-09-28); these baselines date from July. The
    change is 20 pixels per chevron, under `maxDiffPixels: 48`, so `vr` never
    failed on it, and every committed baseline holding a `Select` still shows
    the old chevron. The new baselines show what `main` renders. The stale
    ones elsewhere are left for a refresh of their own.
- **Every text input without a consumer reset shrinks by 4 px**, to its
  stated size. That is a visible change for such consumers, and the reason
  it is named here rather than slipped in.
- **A filter row cannot carry field hints below its controls** while it is
  end-aligned. That is a constraint of the layout, stated in the prop's doc.
- **The portal** renders its filters as `<Toolbar as="form" align="end"
  aria-label="Filters" onSubmit={…}>`, each control in a `Field` with a
  visible label, and `<Button type="submit" variant="accent"><IconSearch />
  Find</Button>`.
