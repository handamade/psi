# The manifest's missing props — ledger arc cycle 8 (D72)

Date: 2026-08-07. Status: **Draft** — cycle 8, closing the item D70 deferred.

Provenance: three consecutive eval runs (07-21, 08-07) reported that
`dist/manifest.json` omits `children` from components that plainly take it, so
an agent cross-checking its output strictly against the manifest would flag
correct code as an invented prop. D70 deferred the fix and recorded a
diagnosis. **That diagnosis was wrong**, and correcting it is the first thing
this cycle does.

## Decisions

- **D72 — `children` is missing from the manifest because it is missing a
  comment, not because a filter drops it.**

  D70's spec recorded this:

  > `emit-manifest.ts`'s `propFilter` keeps a prop when `prop.parent.fileName`
  > is outside `node_modules`. `MenuItem` and `TableCell` **do** declare
  > `children` on their own interfaces, but because those interfaces extend an
  > `HTMLAttributes` type, react-docgen-typescript attributes `children` to
  > React's declaration and the filter drops it.

  Every clause of that is false. Measured with a probe against the real parser:

  | Variant | `children` reported? |
  |---|---|
  | standalone interface, bare `ReactNode` | no |
  | standalone interface, `React.ReactNode` | no |
  | `extends HTMLAttributes`, bare `ReactNode` | no |
  | `extends HTMLAttributes`, `React.ReactNode` | no |
  | standalone interface, **with a JSDoc comment** | **yes** |

  `react-docgen-typescript` reports `children` only when the declaration
  carries a doc comment. Neither `extends` nor the type spelling matters, and
  `propFilter` never sees the prop at all — docgen omits it upstream. The
  components that do report `children` (`Tag`, `Checkbox`, `Switch`, `Tooltip`,
  `NavBar`, the Toast family, the Tabs family) are exactly the ones that
  documented it, and nothing else distinguishes them.

  This also explains the second symptom D70 hit — `aria-label` unusable in
  patterns on `Input` and `Select` while `row-actions` sets it on `Menu` and
  `IconButton`. Same rule: `Checkbox`, `IconButton` and `Pagination` declare
  and document `aria-label`, so it is in the manifest; `Input` and `Select` do
  not.

  **Fix:** document `children` on every component that accepts it. 31 of the 34
  do; `Input`, `Pagination` and `MenuSeparator` do not, and must keep omitting
  it — publishing a prop that does not apply is worse than omitting one that
  does. The manifest currently reports 12, so 19 gain a declaration.

  For components whose props extend an `HTMLAttributes` type the declaration is
  a documented re-statement of a member the type already has: type-compatible,
  no runtime effect, and it is the only thing that makes the prop visible to
  the generator. For the standalone interfaces the declaration already exists
  and only the comment is added.

  **Why not change `propFilter`.** D70 rejected adding `children` to
  `WELL_KNOWN_PASSTHROUGHS` on the grounds that it would give `children` to
  `Input` and `Pagination`. That reasoning survives its own premise being
  wrong — it would still be the wrong fix, and it would not work anyway, since
  the filter never receives the prop.

- **D73 — `aria-*` is valid on any component, and the pattern validator now
  says so.**

  A pattern setting `aria-label` on `Input` is rejected today because the
  manifest has no such prop, which is why `filter-toolbar` ships a `Select`
  with no accessible name. Documenting `aria-label` on all 34 interfaces would
  fix that case and only that case; the next `aria-describedby` or
  `aria-current` would fail the same way.

  Instead the validator accepts any `aria-*` prop on any node, unchecked. This
  is sound because every Psi component spreads its rest props onto a DOM
  element, so every `aria-*` attribute is genuinely valid on every one of them
  — the manifest's silence was never a claim that they are not.

  `packages/react/llms.txt` already documents this for consumers under "Native
  pass-through", and the 08-07 eval agent relied on it correctly. The gap was
  only that the pattern language did not honour its own documented rule.

  `filter-toolbar` then gets the `aria-label`s it should have had.

## What this does not fix

The manifest still omits `onChange`, `onClick`, `value` and every other native
attribute, and that stays deliberate: listing them would bury each component's
real API under hundreds of DOM attributes, which is what `propFilter` exists to
prevent. `children` and `aria-*` are exceptional — the first because it is the
main API of most of these components, the second because it is the only way to
give a control an accessible name.

## Gates

All four. `check-docs-drift` is unaffected: no component or pattern count
changes. Adding documented `children` to 19 components changes
`dist/manifest.json` and every generated `docs/*.md`, which is expected churn,
not drift.

A changeset is required — the manifest is a published artifact and consumers
read it — and it is a `patch`: no API changes, only its description.

## Out of scope

- **Listing the rest of the native attributes.** See above.
- **Re-running the eval.** It grades this cycle from outside, afterwards.
