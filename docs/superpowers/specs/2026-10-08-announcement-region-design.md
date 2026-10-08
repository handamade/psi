# The announcement region is a region, and speaks only what is new: `ToastRegion` sets `role="region"`, both live wrappers set `aria-atomic="false"` (D90)

Date: 2026-10-08. Status: **Implemented** on branch `d90-announcement-region`.

Provenance: the first item of the Psi 0.22 portal handoff (brief D90); the plan
is `docs/superpowers/plans/2026-10-08-psi-0.22-plan.md`, Task 2. The portal
owns the two live regions of one `ToastRegion`. It passes `role="region"`
through the attribute spread until Psi sets it, and it cannot reach the
wrappers to set `aria-atomic` itself.

## What's there today

Measured on `main` at `1919655` (0.21.0), `ToastRegion.tsx`.

1. **The region is a `div` with a name and no role.** It renders
   `<div popover="manual" aria-label="Notifications" …>`. A `div` with no role
   is generic, and ARIA prohibits a name on a generic element
   (`aria-prohibited-attr`, WCAG 4.1.2). The name is also what a landmark
   needs, and the element is not one.
2. **Both live wrappers set no `aria-atomic`.** `role="status"` and
   `role="alert"` carry an implicit `aria-atomic="true"`. A screen reader may
   therefore speak the whole wrapper on each change, so a message added beside
   another can make the wrapper speak both again. The wrappers are the only
   place the stack can be made non-atomic, and a consumer cannot reach them.
3. **What axe says in a real browser: `incomplete`, not `violations`.** Built
   Storybook, Chromium (the Playwright build the repo pins), axe-core 4.12.1
   (the repo's version; the handoff measured 4.13.0), `color-contrast`
   disabled, the region shown (`:popover-open` true):

   | Story | `aria-prohibited-attr` before | after |
   | --- | --- | --- |
   | `feedback-toast--in-region` | `incomplete`, 1 node: the region `div`, "aria-label attribute is not well supported on a div with no valid role attribute." | absent from both buckets |
   | `feedback-toast--with-announcements` | the same | absent from both buckets |

   `violations` held no `aria-prohibited-attr` before the change. axe 4.12
   treats a name on a role-less `div` as "needs review" — impact `serious`,
   tags `wcag2a` and `wcag412`, but not a failure it can assert — so **the
   handoff's "axe reports `aria-prohibited-attr` on every page" is true of the
   `incomplete` bucket and not of `violations`.** A unit test asserting on
   `violations` alone could never go red for this defect. Both runs used a
   Storybook built from this tree, once with `ToastRegion.tsx` as on `main`
   and once with the change.

   The same runs showed a side effect: axe's page-level `region` rule
   ("all content should be contained by landmarks") flagged
   `<div id="storybook-root">` before and does not after. That is a property
   of the story page, not of Psi, and is recorded only because it is the
   region landmark doing what a landmark does.
4. **jsdom cannot see item 3 by default.** The `vitest.setup.ts` popover
   polyfill leaves the shown region at `display: none`, which axe skips, so the
   existing `Toast in a region` axe case passed before the change and passes
   after it. The new axe test shows the region first (below).

## Decisions

- **D90 — The announcement region is a `region` landmark, and its live
  wrappers speak only what is new.**
  - **The region element sets `role="region"`**, after the spread, so a
    caller's `role` cannot displace it (the same rule as `popover`,
    `data-placement` and `data-psi-toast-region` in D83). It is always named —
    `aria-label` defaults to "Notifications" — so it is always a valid
    landmark.
  - **Both live wrappers set `aria-atomic="false"`.** The attribute is
    explicit because `role="status"` and `role="alert"` carry an implicit
    `true`; omitting it leaves the implicit value in force. A screen reader
    then speaks the node that was added, which is one whole `Toast` or one
    `Announcement`, not the wrapper's other contents.
  - **No prop changes.** `role` was already accepted (it is an
    `HTMLAttributes` member) and now has no effect; `ToastRegionProps` gains
    only documentation.

  **Why this is a fix, not a new default.** The current output has a defect
  and no consumer can depend on it. A name on a role-less `div` is
  prohibited by ARIA and flagged by axe, in the bucket axe uses for a result
  it cannot decide, on every page that shows the region. The implicit atomic
  `true` repeats speech: a message added beside another makes the wrapper
  speak both. Nobody builds on a screen reader re-reading a stale toast. What
  changes for a consumer is that a landmark appears in the landmark list and
  the wrapper stops re-speaking; neither is a behaviour to preserve.

  Weighed and not taken:

  - **Leave `role` to the consumer** (the portal's workaround). Every
    consumer then has to know, and the default is a prohibited pattern. The
    portal's pass-through becomes redundant, not wrong.
  - **`role="region"` on a wrapper instead of the root.** The root carries
    the `aria-label`; the label and its role belong on one element.
  - **`role="group"` or `role="complementary"`.** `region` is the generic
    named landmark; the stack is neither a set of controls nor aside content.
  - **`aria-atomic` on the root.** It is inherited by nothing: the attribute
    is read on the live region element itself, so it has to sit on each
    wrapper.
  - **`aria-relevant="additions"`.** It would stop removals being spoken, but
    it changes what is spoken for a reason nobody asked for and is poorly
    supported; the default (`additions text`) is kept.

## Verification

- **Tests first.** Each went red before its change, on assertion
  (`ToastRegion.test.tsx`: `no role`, `role="presentation"`, `aria-atomic`
  null):
  - the region carries `role="region"` and is the one landmark (1);
  - the region keeps `role="region"` when a caller passes `role="presentation"`
    (1);
  - both wrappers carry `aria-atomic="false"` (1);
  - `a11y.axe.test.tsx`: a new case in the shared list, `Toast in a region,
    region role (D90)`, which is green before and after (item 4: jsdom skips
    the hidden region), and a second `describe` that shows the region and
    asserts there is no `aria-prohibited-attr` in `violations` **or**
    `incomplete`. That one was red on `main`'s source — the node reported is
    the region `div` — and is green now.
- **The name in jsdom.** `getByRole("region", { name: "Notifications" })`
  finds nothing in jsdom, for the same reason as item 4: the shown popover
  stays `display: none`, and a hidden subtree computes an empty name. The test
  finds the region with `hidden: true` and asserts the `aria-label` attribute.
  The computed name is covered by the real-browser run of item 3, where axe
  finds the region named and the role valid.
- **Real browser.** Item 3, from a throwaway Playwright spec that injected
  `axe-core` into the built `feedback-toast--in-region` and
  `feedback-toast--with-announcements` stories and was deleted afterwards.
  The existing `toast.interaction.spec.ts` and `app-shell.interaction.spec.ts`
  (11 tests) pass against the built Storybook.
- **The five gates** of `CLAUDE.md` green locally: build, docs drift (46
  components, 22 patterns), 2484 tests in 106 files, lint, promo build, and
  the site gate 9 of 9. `vr` is CI-only.

## Consequences

- **Visual regression: nothing should move.** Two attributes, no CSS. A
  baseline diff is a defect to explain, not to refresh. `vr` allows 0 pixels
  (D89).
- **One landmark per `ToastRegion`.** An application with one region (the
  intended shape; `ToastProvider` renders one) gains one `region` in its
  landmark list, named by `aria-label`. An application that mounts several
  regions should give each a distinct `aria-label`.
- **`role` passed to `ToastRegion` is ignored.** D83's consequence — that a
  caller passing `role` or `aria-live` creates a third live region — now holds
  for `aria-live` only. A consumer already passing `role="region"` (the portal)
  gets the same output and can drop it.
- **Speech itself is not tested.** The attribute is present and axe accepts
  the markup. What a given screen reader says for a message added beside
  another, with `aria-atomic="false"`, was not measured with one; the intent
  is the ARIA-defined behaviour, and support for `aria-atomic` on live regions
  is uneven across screen readers.
- **Docs.** The `ToastRegion` doc comment, `a11y-meta.ts` and
  `packages/react/llms.txt` say the region is a landmark and the wrappers are
  non-atomic; `docs/ToastRegion.md` is generated from the comment.
