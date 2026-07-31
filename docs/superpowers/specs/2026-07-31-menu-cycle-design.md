# Menu cycle — overlay tier on the Popover API (D53)

Date: 2026-07-31. Status: **Draft** — targets 0.8.0.

Provenance: the overlay tier named in the 2026-07-18 market comparison —
"Field/Label and Dialog … Overlays (Dialog, then Menu/Popover) are the next
tier." Dialog shipped in 0.5.0 (D50); Menu is its named successor. Menu is
also the blocker the surface-cycle spec recorded against Toolbar's
priority-plus collapse ("would additionally need a Menu primitive Psi doesn't
have").

Cycle context: the 0.7 cycle closed the Linear board completely — 25 issues,
zero open — and left `main` idle from 2026-07-22. This spec reopens it on the
component-coverage axis.

The evidence for Menu specifically, over the other coverage candidates: it is
the only missing component that unblocks work Psi has already spec'd and
deferred by name, and the only one whose absence forces a consumer to
hand-roll focus management rather than merely a layout.

## Decisions

- **D53 — `Menu` is a controlled overlay on the native Popover API, placed by
  CSS anchor positioning above the anchor floor and by a gated JS fallback
  below it.** Three components ship
  together in `packages/react/src/Menu/`: `Menu`, `MenuItem`,
  `MenuSeparator`. Zero new dependencies — `psi-react` keeps `deps: {}`.

  ```tsx
  interface MenuProps {
    /** Controlled open state. */
    open: boolean;
    /** Fires for every dismissal path; the consumer owns the state. */
    onClose: (reason: "esc" | "outside" | "item-select") => void;
    /** Rendered by Menu, which owns its anchor-name. */
    trigger: ReactNode;
    /** @default "bottom-start" */
    placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
    children: ReactNode;
    className?: string;
    ref?: Ref<HTMLDivElement>;
  }

  interface MenuItemProps {
    children: ReactNode;
    onSelect: () => void;
    /** @default "neutral" */
    variant?: "neutral" | "danger";
    disabled?: boolean;
  }
  ```

  Controlled-only with no internal state and no `trigger`-as-boolean-prop
  escape hatch, exactly per D50. `MenuSeparator` takes no props and renders
  `role="separator"`.

  - **Why `trigger` is a prop and not an `anchorRef`.** CSS anchor
    positioning requires `anchor-name` on the anchor element. Menu must
    therefore be able to set a style on the trigger, which means rendering
    it. Tooltip already establishes this shape in Psi (it wraps its
    children); an `anchorRef` API would force Menu to mutate a node it does
    not own.

  - **No `icon` prop on `MenuItem`.** Button has none, so there is no
    precedent to follow, and `children` is `ReactNode` — a consumer that
    wants an icon composes one. Revisit on real demand.

  - **Mechanism.** `popover="auto"` supplies the top layer, light-dismiss
    and Esc. Menu syncs it with `showPopover()` / `hidePopover()` in an
    effect and listens to `toggle` to report closure — the same shape as
    Dialog's `showModal()` sync. Reason attribution: `esc` from a keydown
    listener on the popover, `item-select` raised by `MenuItem`, everything
    else falls through to `outside`.

  - **Placement — CSS on the modern path, a JS floor-fallback below it.**
    The primary path is pure CSS: `anchor-name` on the trigger;
    `position-anchor` + `position-area` + `position-try-fallbacks` on the
    popover, wrapped in `@supports (anchor-name: --x)`.

    Browser-floor note: the Popover API sits under Psi's documented floor
    (Chrome/Edge 119+, Safari 18+, Firefox 128+) and needs no guard. Core
    anchor positioning reached Baseline 2026 at Chrome 125+ / Firefox 132+ /
    Safari 18.2+, and `@position-try` — the collision flip — needs
    Chrome 125+ / Firefox 147+ / Safari 26+. Both are above Psi's floor.

    **The fallback cannot be CSS.** A top-layer element's containing block
    is the viewport, so without anchor positioning there is no declarative
    way to place it near its trigger — it would render centered. Tooltip's
    technique does not transfer: Tooltip is `position: absolute` inside a
    `position: relative` wrapper and is not in the top layer. The fallback
    is therefore a `CSS.supports("anchor-name", "--x")`-gated code path that
    sets `inset` from the trigger's `getBoundingClientRect()` on open, plus
    `scroll`/`resize` listeners while open. Roughly 30 lines, confined to
    one branch, dead code on every browser at or above the anchor floor —
    and deletable outright once the floor rises. It carries the declared
    `placement` only; **no collision flip below the anchor floor**, which is
    the documented degradation.

    Rejected alternative for the fallback: dropping out of the top layer
    into a Tooltip-style wrapper when unsupported. That would fork the
    component's clipping, stacking and dismissal behaviour across browsers —
    two components wearing one name — and would hand-roll the light-dismiss
    the Popover API already provides.

    The documented browser floor is unchanged by any of this.

  - **Top-layer consequence (recorded).** Dialog and Menu are both on the
    top layer, ordered by invocation, so a Menu opened from inside a Dialog
    correctly renders above it. No `--psi-z-menu` token is needed — the same
    finding D50 recorded for `--psi-z-overlay`.

  - **Keyboard and ARIA — Psi's first keyboard-navigation JS.** `role="menu"`
    on the container, `role="menuitem"` on items, `aria-haspopup="menu"` +
    `aria-expanded` on the trigger. Roving tabindex; Up/Down/Home/End;
    character typeahead; Esc closes and returns focus to the trigger.
    Bounded to one hook in the Menu directory, no dependency.

    This is a deliberate departure from D52, which refused `role="toolbar"`
    because roving tabindex "would demand JS". That reasoning was specific
    to a row of form controls, where roving navigation is actively wrong.
    A menu button *is* the APG menu pattern, and a screen-reader user
    pressing Down expects it to work. The general principle — do not adopt
    an ARIA role whose contract you will not honour — is unchanged here; it
    points the other way.

  - **Tokens.** `packages/tokens/src/components/menu.ts` is pure indirection
    onto the D51 surface family, identical in shape to `panel.ts` and
    `dialog.ts`: `bg → var(--psi-surface-bg)`,
    `border → var(--psi-surface-border)`,
    `radius → var(--psi-surface-radius)`. Item states reuse existing
    recipes rather than introducing anchors:
    `item-bg-hover → var(--psi-fill-neutral3)` (Button's ghost recipe),
    `item-fg-danger → var(--psi-fg-danger)`. D46 scopes follow the suffix
    convention. Consequence: a brand that retunes `--psi-surface-*` gets
    Menu for free, and the contrast gate has only the new item-on-surface
    pairs to prove.

  - **D45 contract.** `Menu/slots.json` declares one `items` slot,
    `accepts: { components: ["MenuItem", "MenuSeparator"] }`, cardinality
    `1..*`. `MenuItem` and `MenuSeparator` are leaves — `"slots": []`,
    absence explicit per D45.

  - **Rejected alternatives.** (a) *floating-ui dependency* — battle-tested,
    but breaks the zero-runtime-dependency posture `psi-react` has held
    through Dialog, for one component. (b) *JS positioning as the only path*
    — identical behaviour at the current floor everywhere, and it is the
    same code the fallback branch already carries; rejected because as the
    sole path it is permanent, whereas gated behind `CSS.supports` it is
    dead code above the anchor floor and deletable when the floor rises.
    The cost of the chosen design over this one is a second code path to
    test; the benefit is that the primary path is declarative and the
    secondary path has an expiry date. (c) *Anchor CSS
    with no fallback, raising the documented floor* — cleanest code, but
    narrows a support claim held since the original design spec, in exchange
    for a fallback Tooltip already proves is acceptable. (d) *Shipping a
    generic `Popover` primitive alongside* — no named demand; D50 refused
    drawer and non-modal Dialog variants on the same grounds, and extraction
    later is non-breaking.

## Acceptance test — a fourth pattern

Toolbar was proven by `filter-toolbar` flipping from `blocked: true` to live;
Menu gets the same machine-checkable exit condition. A new pattern
`packages/react/patterns/row-actions.json` composes a list/table row with an
overflow menu whose destructive item hands off to the existing
`destructive-confirm` pattern. Patterns go 3 → 4, the D48 validator exercises
Menu's props and slots automatically, and the cycle exits on a green gate
rather than a judgement call.

## Rides-along (no decision numbers)

Shipped as **0.7.2 first**, as a clean gate before 0.8 work starts — the two
queued changesets (D46 follow-up, NavBar fix) are already on `main`:

- **MIT `LICENSE`** at repo root. Stated intent in the growth strategy; never
  landed. The market comparison notes Astryx is `npm install` away with MIT.
- **`.DS_Store` in `.gitignore`** — nine are untracked in the working tree.

Branch protection is **already in place** and needs nothing: ruleset
`protect-main` requires a PR and a strict `ci` status check, and blocks
deletion and non-fast-forward pushes. Note for future audits — query
`repos/handamade/psi/rules/branches/main`; the legacy
`/branches/main/protection` endpoint 404s on ruleset-protected branches and
reads as "unprotected".

Then, after 0.8.0 ships: promo Playground demo for Menu (the HAN-42
precedent), and a generation-eval rerun, which the harness cadence
("after any recipe/doc change") makes due once `patterns.json` changes.

## Release, testing, process

- One release: `@handamade/psi-tokens` 0.8.0 (minor — new `--psi-menu-*`
  family) and `@handamade/psi-react` 0.8.0 (minor — Menu, MenuItem,
  MenuSeparator, `row-actions`). Changesets as usual.
- Definition of done is the existing CI gate chain: token build (contrast +
  D46 scopes), D48 pattern validator, docs-drift, unit + axe tests,
  Playwright VR (absolute maxDiffPixels), lint.
- Per-component: unit + axe, VR stories across the four themes
  (light/dark/acme/ember), docs regen. Menu's keyboard hook carries its own
  unit tests — roving order, Home/End, typeahead match, focus return on Esc.
- VR note: Menu's stories must capture the popover *open*. Anchor-positioned
  and fallback placements should both be exercised, so a story pins the
  fallback path explicitly rather than trusting the CI browser's support.

## Out of scope

- Submenus; checkable and radio menu items.
- A generic `Popover` primitive.
- **Toolbar priority-plus collapse.** Menu unblocks it; landing it in the
  same cycle would balloon the release. Non-breaking to add later.
- Tooltip migration onto the same anchor-positioning mechanism — plausible
  follow-up once Menu proves the `@supports` pattern in production, but it
  is a rewrite of a shipped component and earns its own decision.
