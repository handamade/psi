# Announcements route by politeness, not only by tone: `politeness` and `statusLabel` on Toast, a speech-only `Announcement` (D83)

Date: 2026-09-30. Status: **Implemented** on branch `d83-announcer-politeness`.

Provenance: the second item of the Psi 0.21 portal handoff
(`docs/superpowers/plans/2026-09-30-psi-0.21-portal-handoff.md`, brief D83).
The portal owns exactly two live regions, the polite and assertive wrappers of
one `ToastRegion`, and one module of its own is their only writer. Its
announcement policy routes by the kind of event, not by tone:

- the outcome of the operator's own action is assertive, *success included*;
- a state change of the object on screen is polite;
- field errors after a submission are spoken although the fields already show
  them, so some announcements have no visible toast.

It will also use React Aria overlays, which hide everything outside themselves
with `aria-hidden` except elements marked `data-react-aria-top-layer`.

## What's there today

1. **`ToastRegion` routes a child by tone only.** `ASSERTIVE` is
   `{warning, danger}` (`ToastRegion.tsx:21-30`). A success toast is always
   polite, and a consumer cannot say otherwise.
2. **Anything that is not a `Toast` falls through to polite.** There is no
   way to put text into the assertive wrapper without a visible danger or
   warning card.
3. **`ToastRegion` accepts `placement`, `aria-label`, `className`, `children`
   and `ref`, and nothing else** (`ToastRegion.tsx:9-19`). Any other attribute
   is dropped, so the region cannot carry `data-react-aria-top-layer`, and an
   open React Aria overlay would hide both live regions.
4. **`Toast`'s status word is hard-coded English and cannot be dropped**
   (`Toast.tsx:38-43`, `:81`): *Success:*, *Warning:*, *Error:*.
5. **`useToast().show()` takes `variant`, `message` and `action`**
   (`useToast.ts`), and `ToastProvider` renders exactly those onto the `Toast`
   (`ToastProvider.tsx:177`).

## Decisions

- **D83 — The owner of an announcement chooses its politeness; tone is only
  the default. Text can be announced with no visible card.**
  - **`Toast` gains `politeness?: "polite" | "assertive"`.** When set, it
    decides which wrapper `ToastRegion` routes the toast into. When unset, the
    variant decides, exactly as today. `Toast` renders nothing for it: the
    prop is read by the region, the same way `variant` is.
  - **`Toast` gains `statusLabel?: string | null`.** A string replaces the
    visually hidden status word; `null` drops it; unset keeps today's words. A
    string on a `neutral` toast, which has no word by default, renders that
    string.
  - **New `Announcement`**, in `Toast/`:
    `<Announcement politeness="polite" | "assertive">text</Announcement>`.
    - It renders its children in one element carrying `.psi-sr-only`: no card,
      no icon, no `role`, no `aria-live`. `politeness` defaults to `polite`.
    - `ToastRegion` routes it by its `politeness`.
    - It takes no `className`: the one thing a class could do to it is make it
      visible, and then it is a `Toast`.
    - It never renders a live region itself. Outside a `ToastRegion` it
      announces nothing, as a bare `Toast` does. Its docs say this first,
      because it is the component most likely to be used as a second announcer.
    - It holds no state and never removes itself; the owner disposes, as with
      `Toast`. To announce the same text again, the owner removes it and
      renders it again with a new `key`: a live region speaks changes, and an
      unchanged node is not one.
  - **`ToastRegion` spreads its remaining HTML attributes onto its root**,
    `data-*` included. They are spread first, so the region's own attributes
    win: `popover="manual"`, `data-placement`, `data-psi-toast-region`, the
    `aria-label` default. `className` is merged, as before.
  - **`useToast().show()` accepts `politeness` and `statusLabel` too.** The
    brief marks `politeness` optional-if-cheap and does not list `statusLabel`.
    Both are one line each, and `ToastOptions` mirrors `Toast`'s props;
    leaving either out would make a provider-raised toast unable to do what a
    hand-composed one can.
  - **Not done:** `ToastProvider` does not pass attributes through to its
    region. The portal composes `ToastRegion` itself. A `ToastProvider`
    consumer who adopts React Aria overlays will need it; that is a later
    decision with its own prop name.
  - **Every default is unchanged.** With none of the new props, routing, the
    status word and the DOM are what they were.
  - **One consequence to know:** the stack is grouped by wrapper, polite above
    assertive (D64). A success toast sent `assertive` therefore sorts with the
    warnings and errors, not with the other successes.
  - **New pattern `announcer`**: a `ToastRegion` holding a visible toast and
    `Announcement`s, for an application with one announcer. `action-feedback`
    stays as it is. 35 components, 14 patterns.

## Verification

- **Tests first.** Each went red before its change, on assertion unless
  noted:
  - `Toast`: `statusLabel` replaces the word, `null` drops it, and a string
    gives a `neutral` toast one (3 tests). A fourth pins that `politeness`
    renders nothing on the toast; it was green from the start, because the
    prop is never forwarded;
  - `ToastRegion`: an assertive `success` lands in the `role="alert"` wrapper,
    a polite `danger` in `role="status"`, an assertive `Announcement` in
    `role="alert"`, and `data-react-aria-top-layer` reaches the root (4 tests
    red; 4 more pin the polite default, the two-live-regions count, and that a
    passed `popover` or `data-placement` does not displace the region's own);
  - `Announcement`: red on the missing module, then 2 tests for hidden text
    with no `role`, no `aria-live` and no icon;
  - `ToastProvider`: `show({ politeness })` and `show({ statusLabel })`, 3 red,
    and 2 pinning the unchanged defaults;
  - the pattern: `seed-patterns.test.ts` red on the missing `announcer`.
- **Regression.** No existing Toast test was edited. With none of the new
  props the rendered DOM is what it was, and no existing VR baseline is
  expected to change.
- **In a browser** (Chromium 149, built Storybook), which jsdom cannot show
  because it applies neither `.psi-sr-only` nor the region's layout:
  - each `Announcement` is in the accessibility tree under the wrapper its
    politeness names — `status: … Row 12 updated.`, `alert: 2 fields need
    attention.`;
  - each measures 1 × 1 px, and the region is the same size with them as with
    them removed: 346 × 98. With `.psi-sr-only` taken off them it grows to
    346 × 142, so the measurement would catch a visible one;
  - the page holds exactly two live regions.
  This is pinned in `apps/storybook/vr/toast.interaction.spec.ts`.
- **axe:** three new cases, no violations.
- **The five gates** green: 2319 tests in 93 files (2297 in 92 before), docs
  drift at 35 components and 14 patterns, site gate 9 of 9. The interaction
  set is 148 of 148, which includes D82's focus sweep over the three new
  stories.

## Consequences

- **Visual regression: six new baselines, none changed.** Three new stories
  in light and ember — `RoutedByPoliteness`, `WithAnnouncements` and the
  generated `announcer` preset. They come from CI's `vr-baselines` artifact.
- **`ToastRegion` now forwards every attribute it is given.** A consumer who
  passes `role` or `aria-live` to it creates a third live region. The types
  allow it, because `HTMLAttributes` does; the docs say the region is exactly
  two.
- **An `Announcement` left in the region stays readable** to a screen-reader
  user browsing the page, as hidden text. Removing it once spoken is the
  owner's job, as removing a `Toast` is.
- **Speech itself is not tested.** The tests show the text is exposed inside
  a live region that existed before it. What a given screen reader then says,
  and whether it queues or interrupts, was not measured with one.
- **The portal** writes both wrappers from its one module: a `Toast` with
  `politeness="assertive"` for the outcome of the operator's own action, an
  `Announcement` for a state change or for field errors, and
  `data-react-aria-top-layer` on the region.
