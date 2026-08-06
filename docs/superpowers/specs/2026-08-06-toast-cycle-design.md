# Toast — ledger arc cycle 3 (D64–D65)

Date: 2026-08-06. Status: **Draft** — cycle 3 of the ledger coverage arc.

Provenance: the 2026-08-05 ledger coverage arc spec (D59) made the backlog
derived rather than decided. Cycle 2 closed `data-table` and `table-pagination`
and shipped the Table family and Pagination in 0.10.0. Three declared gaps
remain — `action-feedback` (gap: `Toast`), `detail-drawer` (gap: `Drawer`) and
`tabbed-workspace` (gap: `Tabs`). This cycle closes the first.

Toast leads the remaining three because the arc spec named it "independent and
unblocks feedback everywhere": every action the ledger already ships — void a
transaction, bulk-clear a selection, copy a reference — currently completes
silently. Drawer and Tabs each add a screen; Toast makes the screens that
exist honest.

## Decisions

- **D64 — Toast splits into a controlled presentational component, a
  persistent top-layer region, and an opt-in imperative queue.**

  Three components and one hook ship together in
  `packages/react/src/Toast/`, following the `Menu`/`MenuItem`/`MenuSeparator`
  directory precedent (D53): `Toast`, `ToastRegion`, `ToastProvider`, and
  `useToast()`. Zero new dependencies — `psi-react` keeps its empty
  `dependencies`.

  ```tsx
  interface ToastProps {
    /** Status variant. @default "neutral" */
    variant?: "neutral" | "success" | "warning" | "danger";
    /** The message. */
    children: ReactNode;
    /** Trailing affordance — a ghost Button (Undo, Retry, View). */
    action?: ReactNode;
    /** When provided, renders the dismiss button and calls this. */
    onDismiss?: () => void;
    className?: string;
    ref?: Ref<HTMLDivElement>;
  }

  interface ToastRegionProps {
    /** @default "bottom-end" */
    placement?: "top-start" | "top-end" | "bottom-start" | "bottom-end";
    /** Accessible name for the region landmark. @default "Notifications" */
    "aria-label"?: string;
    children: ReactNode;
    className?: string;
    ref?: Ref<HTMLDivElement>;
  }
  ```

  **Why this is not one component.** The three jobs have three different
  lifetimes. `Toast` is a card that renders from props. `ToastRegion` must
  exist in the DOM *before* any toast does, or assistive tech never announces
  the first one (see Accessibility). The queue outlives any individual toast
  and is usually driven from an event handler nowhere near the render tree.
  Collapsing them forces the region to mount and unmount with its content,
  which is precisely the bug.

  **`Toast` alone stays controlled-only, per D50 and D53.** It holds no
  state, runs no timer, and never removes itself; `onDismiss` reports and the
  owner disposes. A consumer that wants full control composes
  `ToastRegion` + `Toast` by hand and never touches the provider. This is the
  path `action-feedback` describes, and it is why the pattern composes
  `Toast` directly rather than a hook call.

- **D65 — The imperative queue is a bounded exception to controlled-only, and
  the exception is the provider, not the component.**

  ```tsx
  const toast = useToast();
  toast.show({ variant: "success", message: "Transaction voided", action: … });
  // → returns a string id; toast.dismiss(id) and toast.clear() also exist.
  ```

  `ToastProvider` owns an array of queued toasts, their auto-dismiss timers,
  and a `limit` (default 3, oldest evicted first). It renders one
  `ToastRegion` and one `Toast` per entry.

  **Why controlled-only yields here specifically.** D50 rejected internal
  state for Dialog and D53 for Menu because in both cases the consumer
  already owns the state that decides visibility — a menu is open because a
  user clicked a trigger that the consumer rendered. A toast has no such
  owner. It is created by an outcome, not by a UI state, and it disappears on
  a timer nobody is watching. Holding the line here would mean every consumer
  hand-rolls an array, a `setTimeout`, a cleanup on unmount, and a pause
  handler — four improvisations, in the arc whose completion criterion is
  counting improvisations. The rule that survives is the useful half:
  **presentational components stay controlled; a stateful container may exist
  when the state has no natural owner, and it must be opt-in.**

  This is deliberately narrow. It licenses `ToastProvider` and nothing else;
  a future stateful container needs its own decision number.

  **`limit` and eviction are the provider's, not the region's.** The region
  positions and announces; it does not decide what survives.

## Variants and elevation posture

Toast takes **Tag's status axis, not the flat action variants**:
`neutral | success | warning | danger`. `guidance.ts` already records
`success | warning` as "Status communication (Tag only)" — this decision
widens that parenthetical to "(Tag and Toast)", because a toast reports an
outcome exactly as a status badge does. `accent` is deliberately absent: an
accent toast would compete with the one accent per visual group, and no
outcome is "primary".

The pattern currently offers `["success", "danger", "neutral"]`. It gains
`warning`, for parity with Tag — a feedback surface that cannot say "partially
applied" forces the consumer to pick between a lie and a hand-rolled div.

**Toast is a surface card with a semantic icon, not a tinted card.** It binds
the shared `--psi-surface-*` family like Menu, Dialog and Panel (D51), and the
variant appears only in the leading icon's colour. Rationale: a stack of three
saturated cards is the loudest thing on the screen, and the tint would fight
the elevated-surface language every other overlay already speaks. The variant
is a 16px icon and an accessible label, not a wash.

## Tokens

`packages/tokens/src/components/toast.ts` → `--psi-toast-*`, registered in
`build.ts`'s `componentVars` registry. Pure indirection, same posture as
`menu.ts` and `table.ts`:

| Key | Binds |
|---|---|
| `bg`, `border`, `radius` | `--psi-surface-*` |
| `fg` | `--psi-fg-primary` |
| `icon-fg-neutral` | `--psi-fg-secondary` |
| `icon-fg-success` | `--psi-fg-success` |
| `icon-fg-warning` | `--psi-fg-warning` |
| `icon-fg-danger` | `--psi-fg-danger` |

**No shadow key, because there is no shadow scale.** An earlier draft of this
table carried `shadow: var(--psi-shadow-overlay)`. Verified against the
emitted CSS: `--psi-shadow-*` does not exist in any form, and neither
`menu.module.css` nor `dialog.module.css` declares a `box-shadow` — Psi's
elevated surfaces are border + background, full stop. Toast matches them.
Recorded rather than quietly deleted, following cycle 2's warnings for
`--psi-fill-accent2` and `--psi-control-{n}-padding-inline-text`: inventing a
plausible token name is this repo's most repeated drafting error. Adding an
elevation scale is a decision, not a detail of this cycle.

Three contrast pairs join `wcagAAPairs` — semantic foregrounds on the
elevated surface, which the matrix gates on `bgPrimary` today but not on
`bgSecondary`:

```ts
{ fg: "fgSuccess", bg: "bgSecondary", minRatio: 4.5 },
{ fg: "fgWarning", bg: "bgSecondary", minRatio: 4.5 },
{ fg: "fgDanger",  bg: "bgSecondary", minRatio: 4.5 },
```

**Measured before this spec was written**, across all four themes: the
tightest is `fgSuccess` on `bgSecondary` in light at **5.87**, against a 4.5
floor. Every pair passes with margin, so the gate is a regression guard rather
than a constraint this cycle has to design around. Gated at 4.5 even though
an icon is non-text content (WCAG 1.4.11 would allow 3.0) — the colours clear
4.5 anyway, and the matrix's existing posture is a single floor.

*A tinted-card design was measured too and also passes* (`fgPrimary` on
`fillTint{Success,Warning,Danger}`, 9.44 minimum). It is rejected on the
design grounds above, not on contrast — recorded so a later cycle does not
re-run the measurement to rediscover that it was never the blocker.

## Mechanism: the top layer

`ToastRegion` renders `popover="manual"` and calls `showPopover()` on mount.

**Why the top layer and not `position: fixed`.** A toast fired from inside a
Dialog must be visible. Dialog uses `showModal()`, which puts it in the
native top layer — and the top layer always paints above the page, whatever
the z-index. A fixed region at `--psi-z-overlay` would be painted *under* the
modal backdrop, so the confirmation for the action a user just took inside a
dialog would be invisible. This is the same reasoning D53 applied to Menu,
reaching the same place.

`popover="manual"` rather than `"auto"`: manual popovers do not light-dismiss
and do not close each other. A toast region must survive outside clicks, and
an auto popover would be dismissed by the very click that triggered the
action being confirmed.

**Pointer-events discipline.** The region is a full-width band in the top
layer, so it must not swallow clicks: `pointer-events: none` on the region,
`pointer-events: auto` on each `Toast`. Missing this makes an invisible strip
of the page dead to the mouse — the failure mode is silent and easy to ship,
so it gets a test.

**Measured correction — a toast under an open modal is painted but inert.**
This section originally claimed a toast raised from inside a Dialog "must be
visible", and left the reader to assume it was also usable. Measured in
Chromium during implementation:

- It **is** painted above the modal's backdrop, and it **is** announced. The
  screenshot pair in `toast.interaction.spec.ts` confirms it: the same clip
  differs before and after the toast is raised, which a `position: fixed`
  region at `--psi-z-overlay` could not achieve. So `popover="manual"` is
  doing exactly the job it was chosen for.
- It is **not interactive** until the dialog closes. `showModal()` makes
  everything outside the dialog's subtree `inert`, so the toast cannot be
  hit-tested — a hit over its box is attributed to the dialog's backdrop.

Crucially, **this is inertness, not paint order**, and no top-layer shuffling
escapes it: an implementation that called `hidePopover()` + `showPopover()` on
every queue change to re-enter the top layer last was written, measured to
change nothing, and removed. Both facts are pinned by tests so the dead end is
not re-explored — the removal is recorded in `ToastRegion.tsx` at the point
where the effect used to live.

Practically this costs little: the common flow is *confirm in the dialog → the
dialog closes → the toast appears*, so the toast is interactive by the time a
user reaches for it. An `action` on a toast raised while a modal is still open
would be unreachable, which is worth knowing but not worth redesigning for.

**Browser floor** is unchanged: the Popover API is the same floor D53
documented for Menu, and the jsdom polyfill in the test setup already covers
`showPopover`/`hidePopover` (`Menu/popover-polyfill.test.tsx`).

## Accessibility

- **The region is persistent, and that is the whole point.** A live region
  announces *mutations* to a subtree that already existed. If `ToastRegion`
  mounted with its first toast inside it, screen readers would see a new
  subtree rather than a change, and the first toast — often the only one —
  would go unannounced. `ToastProvider` therefore renders the region
  unconditionally, empty when the queue is empty.

- **Politeness follows the variant, via two persistent wrappers.** An error
  interrupts; a confirmation waits its turn. `ToastRegion` therefore renders
  **two** always-present children — a `role="status"` (`aria-live="polite"`)
  node and a `role="alert"` (`aria-live="assertive"`) node — and each toast
  renders into the one its variant selects: `neutral`/`success` → polite,
  `warning`/`danger` → assertive.

  Two persistent wrappers rather than one live attribute toggled per message,
  because changing `aria-live` on a node that already holds content is
  unreliably picked up, and rather than putting the role on the toast itself,
  because that reintroduces the mount-with-content problem one level down.
  Both wrappers stay in the DOM empty; only their contents change.

- **Auto-dismiss pauses (WCAG 2.2.1).** Content that disappears on a timer
  needs a way to extend it. The provider pauses every timer on
  `pointerenter` and on focus entering the region, and resumes on leave. A
  toast carrying an `action` gets a longer default (10s vs 5s): an
  affordance that vanishes before it can be reached is not an affordance.

- **`prefers-reduced-motion`** is already handled centrally — the enter
  animation binds `--psi-duration-*`, which D30 zeroes. Nothing
  component-local.

- **The dismiss button** is an `IconButton` with `aria-label="Dismiss
  notification"`, following Dialog's close button.

- **The icon is `aria-hidden`**, with the variant's meaning carried by a
  visually hidden text prefix ("Error:", "Warning:", "Success:"). Colour and
  shape alone never carry the status.

## Pattern revisions

`action-feedback.json` loses its `gaps` entry — that is the cycle's
completion signal, the same one `data-table` and `table-pagination` gave in
cycle 2. Its `variant` parameter gains `warning`.

No other pattern changes: `bulk-action-bar` and `destructive-confirm` both
*use* feedback but neither declares it, and retrofitting a Toast into their
`compose` trees would overstate what they promise.

## Where the app lives

`apps/ledger` gains the provider at its root and one real call site: voiding
a transaction from the existing `row-actions` menu raises a `success` toast
with an Undo action. That is the acceptance target — per D59, each component
is built against a real ledger screen, not against Storybook alone.

## Testing

- Unit (vitest + RTL): variant → role/politeness mapping; `onDismiss`
  reporting without self-removal; region persistence across an empty queue;
  provider eviction at `limit`; timer pause on hover and focus; timer cleanup
  on unmount.
- Axe: the existing `a11y.axe.test.tsx` sweep picks the components up.
- VR: stories per variant, plus a stacked-region story. `animations:
  "disabled"` is already set in the Playwright config, so the enter animation
  will not flake.
- A Playwright interaction spec for the top-layer claim — a toast raised from
  an open Dialog must be visible — following `vr/menu.interaction.spec.ts`.
  This is the one assertion jsdom cannot make, because the polyfill fakes the
  top layer.

## Gates

All four, in order — `check-docs-drift` is a separate CI step and is the one
that gets forgotten:

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint
```

`vr` is CI-only. Docs-drift **will** fail until every prose count moves
**25 → 28 components** (Toast, ToastRegion, ToastProvider join the explicit
`COMPONENTS` list in `emit-manifest.ts`; `useToast` is a hook and is not a
manifest entry). The pattern count stays 13. Generated
`packages/react/docs/*.md` are tracked and must be committed — cycle 2 learned
this when `Checkbox.md` stayed stale through four green gates.

A changeset is required: this is a user-visible change, and `packages/*`
version in lockstep.

## Risks

- **Scope creep into a notification system.** Promotion to a persistent
  inbox, grouping, or per-toast progress bars would each be their own
  decision. The guard is the out-of-scope list below.
- **The provider is a precedent.** D65 bounds it in words; the real guard is
  that the next stateful container needs a decision number.
- **Timer tests are the flaky kind.** Use vitest fake timers throughout; no
  real waiting in unit tests.

## Out of scope

- **Promotion/persistence** — no notification centre, no history, no unread
  count. A toast is transient by definition.
- **Swipe-to-dismiss** — a pointer-gesture layer with its own accessibility
  obligations; the dismiss button is the mechanism.
- **Per-toast progress indicators** — decorative, and they animate against
  the reduced-motion zeroing.
- **Stacking/collapse animation** — cycle 7's editorial and motion pass owns
  motion over a frozen set. Enter/exit only here.
- **Positioning per toast** — placement is the region's, so a screen has one
  toast location. Two competing corners is a bug, not a feature.
