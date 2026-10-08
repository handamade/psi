# One queue for toasts and announcements: `useToast().announce()` speaks through the provider's region, an announcement leaves after a dwell Psi owns, and `ToastProvider` forwards region props (D91)

Date: 2026-10-08. Status: **Implemented** on branch `d91-toast-announce-queue`.

Provenance: the second item of the Psi 0.22 portal handoff (brief D91); the
plan is `docs/superpowers/plans/2026-10-08-psi-0.22-plan.md`, Task 3. It builds
on D90, which made the region a `region` landmark and both live wrappers
`aria-atomic="false"`. Where this spec departs from the handoff's wording, the
departure is a decision below, with its reason.

## What's there today

Measured on `main` at `6cda910` (D90 merged), `packages/react/src/Toast/`.

1. **`ToastProvider` can only show a `Toast`.** `show()` queues a toast and
   the provider renders each queued item as a `<Toast>` inside its own
   `ToastRegion` (`ToastProvider.tsx:94`, `:181`). A speech-only
   `Announcement` (D83) cannot enter the provider's region.
2. **Composing the region by hand loses the queue.** An application that
   renders its own `ToastRegion` to hold an `Announcement` gives up the
   provider's limit and timers, or runs a second region beside the
   provider's — a second announcer.
3. **The region's props are unreachable.** `ToastProvider` passes only
   `placement` to its region (`:181`). Its consumer cannot set the region's
   `aria-label` (the landmark's name since D90), a `ref`, a `className` or a
   `data-*` attribute such as `data-react-aria-top-layer` (D83).
4. **`Announcement` has no lifetime.** Its doc comment asks the owner to
   "remove it once it has been spoken". An application cannot observe that
   moment. The portal guesses it with a one-second minimum dwell of its own,
   and to keep one writer it renders no visible `Toast` at all.

## Decisions

- **D91 — One queue for toasts and announcements.**
  - **`useToast()` gains `announce(message, options?)`.** The signature is
    `announce(message: ReactNode, options?: { politeness?: ToastPoliteness }):
    string`, beside `show`, `dismiss` and `clear`. It returns an id, which
    `dismiss(id)` accepts like a toast's. `politeness` defaults to
    `"polite"`, as `Announcement`'s does. The announcement renders as an
    `<Announcement>` in the provider's one `ToastRegion`, routed by
    `politeness` to the wrapper that already exists. **`announce()` never
    renders a live region**; there is still one region and one queue (handoff
    risk B.6).
  - **An announcement leaves after a dwell of 1000 ms**, the module constant
    `ANNOUNCEMENT_DWELL = 1000` in `ToastProvider.tsx`. It is long enough for
    a screen reader to start speaking a node that was added, and short enough
    that a live wrapper does not accumulate stale text a user may land on when
    browsing. It is the value the portal runs today, so adopting it changes
    nothing the portal has tested. The removal itself is not spoken
    (`aria-relevant` stays at its default, `additions text`); whether a given
    screen reader stops a long message mid-sentence when its node leaves was
    not measured (see Consequences).
  - **Lifetime rule: every announcement leaves after its own dwell, and a
    later announcement does not remove an earlier one early.** The handoff
    proposed that a later announcement of the same politeness "replaces" the
    earlier. Not taken: removing a node one tick after it was added can cut
    its speech in some screen readers before it starts, and the replace buys
    nothing D90 did not already buy — with `aria-atomic="false"` a second
    added node is spoken on its own, without re-speaking the first. Replacing
    would need a measured reason (a screen reader that re-speaks a sibling,
    say), and none has been measured. At most a dwell's worth of
    announcements share a wrapper.
  - **Announcements never count against `limit`.** The provider keeps two
    lists, toasts and announcements; the eviction loop in `show()` walks the
    toast list only. A burst of announcements can therefore never evict a
    visible toast, and a burst of toasts never drops an announcement before
    it was spoken.
  - **One timer map, one id sequence.** An announcement's timer is armed by
    the same `arm()` helper the toasts use, so the three disposal paths
    already there cover it with no new code: `dismiss(id)` clears its timer,
    `clear()` clears every timer and empties **both** lists, and unmounting
    the provider clears every timer. Ids come from the same sequence, so a
    toast id and an announcement id never collide.
  - **The dwell pauses with the region, as a toast's timer does.** Pointer or
    focus inside the region pauses every timer (D65, WCAG 2.2.1), and an
    announcement's is one of them. Accepted rather than special-cased: an
    announcement held past its dwell is not re-spoken (`aria-atomic="false"`),
    it is visually hidden, and the pause ends when the pointer or focus
    leaves. A second rule for one kind of timer would be a second code path
    with no user-visible benefit.
  - **Rendering order inside a wrapper: toasts, then announcements.** An
    `Announcement` is absolutely positioned and visually hidden
    (`.psi-sr-only`), so it takes no space in the stack and its DOM position
    changes nothing a sighted user sees. Speech follows insertion, not DOM
    order.
  - **`ToastProvider` forwards region props.** `ToastProviderProps` extends
    `Omit<HTMLAttributes<HTMLDivElement>, "children">` and declares
    `aria-label`, `className` and `ref` (to the region element), the same
    surface `ToastRegion` has. Everything but the provider's own props
    (`limit`, `duration`, `actionDuration`, `placement`, `children`) is spread
    onto `<ToastRegion>`, so `data-*` attributes reach the region element and
    the region's own attributes still win (D83, D90). `aria-label` keeps
    `ToastRegion`'s default, "Notifications".
  - **`announce` takes the message first, not an options object.** The
    handoff sketched `announce({ message, politeness })`. An announcement has
    one required field and one optional one, and the text is the call:
    `toast.announce("Row 12 updated")` reads as what it does. `show()` keeps
    its object because a toast has five fields. The id return mirrors
    `show()`'s.
  - **No exported queue hook.** The handoff listed, as optional, exporting
    the queue as a hook so a hand-composed `ToastRegion` gets the same limit
    and timers. Not taken: the reason to hand-compose a region was to hold an
    `Announcement` beside the provider's toasts, which `announce()` now
    covers, and a second way to own the queue is a second announcer waiting
    to happen. Revisit when a consumer needs a region the provider cannot
    render.

  **Why this is an addition, not a behaviour change.** No existing call
  changes: `show`, `dismiss`, `clear` and every `ToastProvider` prop behave as
  before, and a provider that never calls `announce()` renders the same
  markup. The region props are new and optional. `Announcement` itself is
  unchanged; only its documentation now states the provider's lifetime rule
  for an announcement the provider owns, and still says a hand-rendered one
  is the owner's to remove.

  Weighed and not taken:

  - **One list with a `kind` tag.** Chronological across kinds, but the
    eviction loop would have to skip announcements by tag and every render
    would filter by it. Two lists make "never counts against the limit" a
    property of the data rather than a condition in a loop.
  - **A dwell scaled by message length.** A screen reader's speaking rate is
    the user's setting, which the page cannot read; any formula would be a
    guess with a longer tail of stale text. The dwell bounds how long the
    node stays, not how long it is spoken.
  - **A configurable dwell (`announcementDuration`).** No consumer has asked
    for one, and the portal runs the same value. A prop can be added later
    without breaking anyone; removing one cannot.

## Verification

- **Tests first.** In `ToastProvider.test.tsx`, under fake timers like the
  auto-dismiss tests beside them, with a small `Probe` component that calls
  `useToast()` in an effect and runs a callback once. Each went red before the
  change (`announce` was not a function; the forwarded props were dropped):
  - `announce()` renders an `Announcement` in the wrapper its politeness
    names, and no `Toast`;
  - an announcement leaves after its dwell — present at 999 ms, gone at
    1000 ms;
  - a later announcement of the same politeness does not remove the earlier
    one early;
  - announcements never evict a visible toast through the limit;
  - `clear()` removes announcements as well as toasts, and unmounting
    disposes an announcement's timer;
  - `dismiss(id)` removes an announcement by the id `announce()` returned;
  - `aria-label`, `ref` and a `data-*` attribute given to `ToastProvider`
    reach the region element.
  - Written after the implementation, so green on first run: the dwell
    pauses while the pointer is over the region and runs out after it leaves.
- **The region in jsdom.** As in D90, the shown popover stays
  `display: none` under the jsdom polyfill, so `getByRole` needs
  `hidden: true` and a hidden subtree computes no name. The forwarding test
  finds the region with `hidden: true` and asserts its `aria-label`
  attribute, its `data-*` attribute and that the ref is that element.
- **axe.** `a11y.axe.test.tsx` gains a case for a provider that has announced
  once, with the region shown (`display: block`, as D90's case does) so axe
  inspects it; no violations.
- **The five gates** of `CLAUDE.md` green locally: build, docs drift, the
  full test suite, lint, promo build and the site gate. `vr` is CI-only.

## Consequences

- **Visual regression: nothing should move.** No CSS changes, and no story
  renders an announcement through the provider; an `Announcement` is visually
  hidden in any case. A baseline diff is a defect to explain (D89).
- **The portal can show visible toasts again.** It can raise toasts with
  `show()` and speech with `announce()` through one provider, and drop its own
  dwell and render record. Its handoff item §8 row 2 closes.
- **`ToastHandle` gains a required member.** Code that only calls
  `useToast()` is unaffected. Code that builds a `ToastHandle` itself — a test
  double passed to `ToastContext.Provider`, say — must add `announce` to
  type-check. Accepted for a minor: the handle is the provider's output, and an
  optional `announce` would make every caller check for it.
- **A hand-rendered `Announcement` is still the owner's to remove.** The
  lifetime rule applies to announcements the provider owns. Inside a
  hand-composed `ToastRegion`, removing it is still the owner's job, and the
  docs recommend the same one-second dwell.
- **Speech itself is not tested.** As with D90, what a given screen reader
  says was not measured with one. The dwell rests on the portal's experience
  and on the ARIA-defined behaviour of non-atomic live regions.
- **Docs.** The `Announcement`, `ToastProvider` and `useToast` doc comments,
  `a11y-meta.ts` and `packages/react/llms.txt` state `announce()`, the dwell
  and the lifetime rule; `docs/*.md` are generated from the comments.
