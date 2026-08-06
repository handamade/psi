# Drawer — ledger arc cycle 4 (D66)

Date: 2026-08-06. Status: **Draft** — cycle 4 of the ledger coverage arc.

Provenance: the 2026-08-05 ledger coverage arc spec (D59) left one question
open by name:

> **Note on Drawer:** it may not be a new component. Dialog exists, and D53
> established the overlay tier on the Popover API; a drawer is plausibly
> `Dialog` with a side placement rather than a sibling. Left open for the
> Drawer cycle to decide; if so, the backlog drops to four.

This cycle decides it. Cycle 3 shipped Toast in 0.11.0 and closed
`action-feedback`, leaving `detail-drawer` (gap: `Drawer`) and
`tabbed-workspace` (gap: `Tabs`).

## Decisions

- **D66 — A drawer is a `Dialog` placement, not a component.** `Dialog` gains

  ```tsx
  /** Where the panel sits. inline-* pin it full-height to that edge — a
   *  drawer / side sheet. @default "center" */
  placement?: "center" | "inline-start" | "inline-end";
  ```

  and nothing else changes: no new component, no new file, no export. The
  manifest stays at **28 entries**, and `detail-drawer` composes `Dialog`.

  **The evidence that this is sufficient, not merely cheaper.** The
  `detail-drawer` pattern authored in cycle 1 — before any implementation
  existed to bias it — declares slots `title`, `body`, `footer` and one prop,
  `side`. That is Dialog's slot set exactly, plus a placement. The pattern was
  the backlog's own description of the need (D59), and what it describes is
  Dialog with an edge.

  Everything a drawer needs beyond position, Dialog already owns and a sibling
  component would have to duplicate or wrap: `showModal()` modality, the
  platform focus trap, `aria-modal`, focus restore, inert background,
  `onClose(reason)` across esc/backdrop/close-button, the `dismissible` gate,
  and the title/footer slots. Duplicating that is how a design system grows two
  subtly different focus traps.

  **Mechanism — CSS only, measured before this spec was written.** A modal
  `<dialog>` pins to an edge with logical margins:

  ```css
  margin-inline-start: auto;  /* inline-end placement */
  margin-inline-end: 0;
  margin-block: 0;
  height: 100dvh;
  ```

  Probed in Chromium at a 1000×800 viewport with `width: 560px`: the dialog
  reports `x: 440, width: 560` (flush to the right edge), `height: 800` (full
  viewport), and `:modal` matches. No JS change to `Dialog.tsx` — the
  `showModal()` sync, the cancel/click handlers and the reason plumbing are
  untouched.

  `dvh` rather than `vh` so mobile browser chrome does not clip the footer.

  **`width` is reused, not renamed.** For an `inline-*` placement the existing
  `400 | 560 | 720` ramp is the drawer's width; for `center` it is the dialog's.
  Same prop, same meaning, one less concept. A drawer whose *height* needs
  controlling is a block-edge sheet, which is not in this cycle.

  **Logical properties buy RTL for free.** `inline-start` / `inline-end` rather
  than `left` / `right`, so an RTL theme flips without a second code path.
  Naming them `start`/`end` — as the cycle-1 pattern did — is rejected: it
  reads as if it might mean the block axis, and the CSS names are already the
  vocabulary.

  **Discoverability is the pattern's job, not the component list's.** The
  objection to folding Drawer into Dialog is that an agent searching "drawer"
  finds no component. That is what D47 patterns exist for: `detail-drawer`
  already carries `match` keywords — "side sheet", "slide-over", "row detail",
  "record detail panel" — and psi-mcp searches patterns alongside components.
  An agent asking for a slide-over gets a pattern whose compose tree is
  `Dialog placement="inline-end"`. Adding a component purely so a name exists
  is the "component because a list says so" failure D59 was written against.

  **Consequence for the arc: the backlog drops to one.** After this cycle only
  `tabbed-workspace` (gap: `Tabs`) remains, and the predicted five-component
  backlog resolves to four — Table, Pagination, Toast, Tabs. Recorded because
  the arc spec's own estimate said "if so, the backlog drops to four", and this
  is that branch being taken.

## Motion

Each placement gets its own enter animation, driven by
`var(--psi-duration-200)` / `var(--psi-ease-soft)` like the existing
`dialog-enter`:

| Placement | From |
|---|---|
| `center` | `opacity 0; scale(0.97)` — unchanged |
| `inline-start` | `translateX(-100%)` |
| `inline-end` | `translateX(100%)` |

`prefers-reduced-motion` needs nothing component-local: D30 zeroes the duration
tokens centrally.

The `translateX` directions are physical on purpose. A logical `translate` for
the RTL case would need `translateX(-100%)` for `inline-end` under `dir="rtl"`,
which CSS cannot express from the same declaration; the slide direction is
cosmetic and a wrong-direction slide in RTL is a smaller defect than a second
code path. Recorded rather than silently accepted — revisit if an RTL brand
ships.

## Tokens

**None.** This is the first cycle in the arc to add no tokens at all: the
drawer binds the `--psi-dialog-*` family Dialog already has. Radius is the one
adjustment, and it is a placement-scoped override in the CSS module rather than
a new token — an `inline-end` drawer keeps the radius on its leading corners
and squares the two against the viewport edge.

No new contrast pairs: the surface, foreground and backdrop are Dialog's,
already gated.

## Accessibility

Unchanged from Dialog (D50), and that is the point — the focus trap,
`aria-modal`, focus restore and inert background come from `showModal()`
whatever the placement. `a11yMeta.Dialog` gains one sentence noting that
`placement` moves the panel without altering any of it.

One real consideration: a full-height drawer is more likely than a centered
dialog to overflow. The panel scrolls internally (`overflow-y: auto` on the
body region) so the footer stays reachable — a footer scrolled out of a modal
with no other exit is a trap when `dismissible` is `false`.

## Pattern revisions

`detail-drawer.json`:

- `compose.component`: `"Drawer"` → `"Dialog"`
- `compose.props`: `{ side: "{param:side}" }` → `{ placement: "{param:placement}" }`
- the parameter's key becomes `placement` with options
  `["inline-end", "inline-start"]`, default `inline-end`, so the generated
  preset is valid JSX against the real prop
- `gaps`: `["Drawer"]` → `[]`

The patterns validator closes this the same way it closed `action-feedback` —
it fails the build while a gap names a component that now exists. Here the gap
names a component that will never exist, so the entry is removed because the
capability arrived, which is the mechanism working for a case it was not
explicitly designed for.

Pattern count stays **13**; component count stays **28**. `check-docs-drift`
should therefore stay green untouched this cycle — the first time in the arc.
If it fails, something unintended changed.

## Where the app lives

`apps/ledger` — the `row-actions` menu's "View details" item currently only
closes the menu. It opens a drawer with the transaction's detail and its
actions, which is the acceptance target per D59.

## Testing

- Unit: `placement` defaults to `center`; each value applies its class; the
  dismissal contract (`esc`, `backdrop`, `close-button`) is unchanged under
  every placement — the backdrop-click test in particular, since an edge-pinned
  panel changes which coordinates are backdrop.
- Axe: add drawer cases to the existing sweep.
- VR: stories per placement, plus a long-content story proving internal scroll.
- Playwright: the geometry claim — an `inline-end` drawer is flush to the
  viewport's inline edge and full height — since jsdom has no layout.

## Gates

All four, in order:

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint
```

`vr` is CI-only. New stories mean new baselines; cycle 3 established that
generating them in a Linux container is safe **when** the existing baselines
are re-verified in the same run first — 188/188 passed there. Repeat that
check, do not assume it.

A changeset is required: `minor`, since `placement` is a new prop.

## Out of scope

- **Block-edge sheets** (`block-start` / `block-end`) — a bottom sheet has its
  own drag/snap expectations. Its own decision if wanted.
- **Non-modal drawers** — a persistent inspector that leaves the page
  interactive is not a Dialog at all, and D50's controlled-only overlay
  posture does not cover it.
- **Resizable width** — the ramp is the vocabulary.
- **Nested drawers.**
