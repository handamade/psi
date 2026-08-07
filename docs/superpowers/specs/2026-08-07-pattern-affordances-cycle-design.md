# Patterns that cannot render themselves — ledger arc cycle 7 (D70–D71)

Date: 2026-08-07. Status: **Draft** — cycle 7, closing what the 2026-08-07 eval
run found.

Provenance: `tools/generation-eval/runs/2026-08-07.md`. The retargeted eval
returned zero hard fails and **two improvisations**, so D59's criterion — a
ledger run with zero improvisations — is not yet met.

The two improvisations are the same defect wearing two hats:

| The agent needed | The pattern that asked for it |
|---|---|
| an ellipsis glyph | `row-actions` → `"trigger-icon": "[icon]"` |
| a key/value display | `detail-drawer` → `"body-note": "[key-value summary of the selected record]"` |

Both patterns declare `gaps: []` and `blocked: false`, and both are correct to
do so under the current definition: `gaps` lists **components named in
`compose`** that are missing from the manifest, and every component these two
name exists. The thing that does not exist is named in `content`, as prose,
inside square brackets — where nothing looks.

## Decisions

- **D70 — The gap is not "two missing components", it is "a pattern that
  cannot render itself", and that is a different search.**

  Cycles 1–5 found missing components by asking which patterns referenced a
  component the manifest lacked. That search is complete and its answer is
  genuinely zero — which is why cycle 6 opened by reporting an empty backlog.
  Neither of these two would ever have appeared in it. They are not missing
  *references*; they are missing *referents* for prose.

  Ships:

  - **`IconMoreHorizontal`** — three dots on the 24-viewBox grid, same shape as
    the other 25 icons. `row-actions` is the only pattern in the set whose
    trigger is icon-only, and it shipped specifying an icon the library does
    not contain.
  - **`DescriptionList` + `DescriptionItem`** — a `<dl>` of term/value pairs.
    `detail-drawer`'s entire body is this and nothing else; the pattern
    currently emits the sentence "[key-value summary of the selected record]"
    into the preset, which is not code.

  `DescriptionItem` takes the term as a prop and the value as children,
  matching `Field`'s `label` idiom rather than inventing a two-slot shape.
  Two layouts: `stacked` (term above value, the safe default at narrow
  widths) and `inline` (two-column grid, what a drawer wants). No `size`
  prop — this is type, and the type scale is already expressed by
  `--psi-text-*`.

  **Deliberately not shipped: a `Stack` component.** The eval reported the
  hand-rolled flex wrapper as an improvisation and it was assessed as correct
  behavior — `packages/react/llms.txt` prescribes pairing `.psi-gap-*` with
  `display: flex`, so the system can express it and says how. Shipping `Stack`
  because an agent mentioned it would be responding to the report rather than
  to the finding.

- **D71 — A pattern declares the affordances its content requires, and the
  validator resolves them.**

  The fix for the *class* of bug, not the two instances. Patterns gain an
  optional `requires` array:

  ```json
  "requires": [
    { "content": "trigger-icon", "kind": "icon", "name": "IconMoreHorizontal" }
  ]
  ```

  Each entry names a `content` key whose placeholder stands for something the
  design system must supply, and what would satisfy it. `kind: "component"`
  resolves against the manifest; `kind: "icon"` resolves against the icon
  roster. An unresolved entry is a gap, and a pattern with gaps is `blocked` —
  the existing machinery, now fed by a source it could not previously see.

  **What this does not do, stated plainly.** It cannot stop an author from
  writing a bracketed placeholder and declaring nothing — the validator cannot
  read intent out of prose, and no schema change makes it able to. What it does
  is convert a *silent* placeholder into a *declared* requirement, which is
  checkable, and it fails the build the moment a declared requirement stops
  resolving. For the residual risk the build gains a **non-fatal report** of
  every bracketed content value, so a new one is visible in CI output rather
  than invisible. That is a smaller claim than "this bug cannot recur" and it
  is the true one.

  Of the 19 bracketed placeholders across the 13 patterns, **only these two are
  defects.** The other 17 stand for consumer copy ("[record title]",
  "[what just happened]") or are authoring notes ("[numeric columns align right
  and use tabular figures]"). A validator that flagged all 19 would be noise,
  and the reason this cannot be inferred automatically is exactly why the
  declaration has to be authored.

## Also in this cycle, without decision numbers

Three findings from the same run that are corrections rather than design:

- **`packages/react/README.md` omits `utilities.css`** — it lists four
  stylesheets where there are five. `llms.txt` is correct, which is why the
  eval agent did not trip; a human reading the README would. Worse,
  **`CLAUDE.md` asserts that `llms.txt` and the README "had it right all
  along"**, which is half false and has been since it was written to record the
  D62 improvisation. Both get fixed. The shape is D68's exactly: machine trail
  right, human-facing doc wrong.
- **`filter-toolbar` and `table-pagination` contradict each other.**
  `table-pagination` wraps its `Select` in `Field label="Rows per page"`;
  `filter-toolbar` puts a bare `Input` and `Select` in the same `Toolbar`. Both
  are toolbars, so an agent building a filter row cannot tell which to follow.
  Resolution: `guidance.rules`' Field rule already says *labeled* form
  controls, and toolbar filter controls are named by `aria-label`/placeholder
  rather than a visible label. The rule gets the distinction stated explicitly,
  naming both patterns so the comparison is the documentation.

  **This turned up a second symptom of the deferred emitter bug.** The intent
  was to give `filter-toolbar`'s controls explicit `aria-label`s so the pattern
  demonstrates the rule rather than merely not violating it — and the validator
  rejected it: `unknown prop "aria-label" on component "Input"`. The same
  `propFilter` that drops `children` drops every native attribute, so
  **the pattern language cannot express an accessible name on a control whose
  manifest omits one.** `placeholder` works only because it is on the
  three-entry `WELL_KNOWN_PASSTHROUGHS` allow-list; `aria-label` is not, though
  `Menu` and `IconButton` declare theirs and `row-actions` uses them.

  So `filter-toolbar` gets a `placeholder` and its `Select` stays unnamed,
  which is an accessibility hole in the pattern that this cycle cannot close.
  Recorded rather than quietly accepted: it belongs to the same fix as
  `children`, and it raises that deferred item's priority from tidiness to
  correctness.

## Deferred, with the diagnosis recorded

**The manifest's `children` inconsistency is an emitter bug, not a docs
inconsistency**, and it is deferred to its own cycle rather than rushed into
this one.

> **Superseded — this diagnosis was wrong.** D72 measured it against the real
> parser and every clause below is false. `react-docgen-typescript` omits
> `children` unless the declaration carries a **JSDoc comment**; `extends`, the
> type spelling and `propFilter` are all irrelevant, and the filter never
> receives the prop at all. See
> `2026-08-07-manifest-children-cycle-design.md`. Left in place rather than
> rewritten, because "plausible diagnosis recorded confidently, then falsified
> by one probe" is the thing worth remembering.

Diagnosis, so the next cycle starts from the answer: `emit-manifest.ts`'s
`propFilter` keeps a prop when `prop.parent.fileName` is outside
`node_modules`. `MenuItem` and `TableCell` **do** declare `children` on their
own interfaces, but because those interfaces extend an `HTMLAttributes` type,
react-docgen-typescript attributes `children` to React's declaration and the
filter drops it. `Tag`, `Checkbox` and `Switch` keep theirs.

The obvious one-line fix — adding `children` to `WELL_KNOWN_PASSTHROUGHS` — is
wrong: it would give `children` to every component extending `HTMLAttributes`,
including `Input` and `Pagination`, which take none. Publishing a prop that
does not apply is worse than omitting one that does. The correct fix keys off
whether the component's own source declares `children`, and that deserves its
own cycle with its own tests.

This has now surfaced in three consecutive eval runs in some form, so it is
recorded as owed rather than closed.

## Gates

All four, in order. **`check-docs-drift` will fail** — the component count goes
32 → 34 and the icon count 25 → 26, so every prose statement of those numbers
moves with it. This is the gate that gets forgotten every coverage cycle; it is
in the plan's task list for that reason.

`vr` is CI's. New component stories need baselines generated with
`--update-snapshots=missing` after a `none` run confirms the 16 known token
specimen divergences and nothing else.

A changeset is required: two new components and an icon are user-visible, and
it is a `minor`.

## Out of scope

- **A `Stack` component** — see D70.
- **The manifest `children` fix** — see above.
- **Re-running the eval.** The run that grades this cycle comes after it, not
  inside it. Grading and correcting in one breath is what D68 already ruled
  out, and it applies to its own findings too.
