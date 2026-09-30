# Announcements route by politeness, not only by tone: `politeness` and `statusLabel` on Toast, a speech-only `Announcement` (D83)

Date: 2026-09-30. Status: **In progress** on branch `d83-announcer-politeness`.

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

To be filled in when implemented. Tests that go red first:

- a `success` Toast with `politeness="assertive"` renders inside the
  `role="alert"` wrapper; a `danger` Toast with `politeness="polite"` inside
  the `role="status"` wrapper;
- an `Announcement` renders in the wrapper its `politeness` names, is visually
  hidden, and has no `role`, no `aria-live` and no icon;
- `statusLabel={null}` renders no status word; `statusLabel="Fehler:"` renders
  that word and not *Error:*;
- `data-react-aria-top-layer` passed to `ToastRegion` appears on its root, and
  a passed `popover` does not displace `manual`;
- `show({ politeness, statusLabel })` reaches the rendered toast;
- a region holding toasts and announcements of both kinds still contains
  exactly two live regions;
- in a browser: an `Announcement` takes no space in the stack and is exposed
  inside its wrapper.

Regression: with no new props, every existing Toast test passes unchanged.

## Consequences

To be filled in when implemented.
