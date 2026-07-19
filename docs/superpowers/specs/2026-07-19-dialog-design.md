# Dialog — modal on the native top layer + D45 slot-contract adoption (D50)

Date: 2026-07-19. Status: **Approved design, scheduled for 0.5** (second of the
two eval-blocking component gaps; HAN-12). Ships after Field (D49, merged) and
carries the release's second deliverable: the first authored D45 slot
contracts from the composition-contracts spec
(`2026-07-18-composition-contracts-spec.md`).

Evidence base: the psi-demo consumer dogfood (HAN-17) had to fake a
destructive confirm with an inline two-step button swap — the D47
`destructive-confirm` pattern needs a real modal to compose into.

## Decisions

- **D50 — One modal `Dialog` on the native `<dialog>` element.** Modal only
  (no non-modal/drawer variants); controlled only (`open` + `onClose`, no
  internal state, no trigger prop). `showModal()` provides the top layer,
  focus trap + `inert` background, focus restore, and `aria-modal` — Psi
  owns only scroll lock, motion, and `::backdrop` styling. Zero new
  dependencies.

  Props (flat, docgen-clean): `open: boolean` (required),
  `onClose: (reason: "esc" | "backdrop" | "close-button") => void`
  (required — controlled-only means the consumer must hear every dismissal),
  `title?: ReactNode`, `footer?: ReactNode`, children = body,
  `width?: 400 | 560 | 720` (default `560`, pixel-true per house rules;
  clamps to the container under the `sm` breakpoint),
  `dismissible?: boolean` (default `true`), `ref?: Ref<HTMLDialogElement>`,
  `className?: string`. **No `variant`** — danger semantics live on the
  footer's Buttons (one accent per visual group; `danger` only for
  destructive actions).

  - **Anatomy**: header row — `title` renders an `<h2>` with a generated id
    wired to `aria-labelledby`, plus a close IconButton when `dismissible`;
    body = children; footer row when given. Without `title`, the consumer
    passes `aria-label` (axe-enforced: one or the other).
  - **Dismissal** — `dismissible` governs all three paths uniformly: Esc
    (native `cancel` event → `preventDefault()` + `onClose("esc")`),
    backdrop click (click whose target is the `<dialog>` element itself →
    `onClose("backdrop")`), close button (`onClose("close-button")`).
    `dismissible={false}` renders no close button and swallows Esc and
    backdrop clicks — forced-choice flows exit through the footer only.
  - **Scroll lock**: body `overflow: hidden` while open, restored on close.
  - **Motion**: fade + subtle scale over `--psi-duration-200`
    `--psi-ease-soft`; `::backdrop` fades on the same clock. utilities.css
    reduced-motion zeroing applies automatically.
  - **Top-layer consequence (recorded)**: `--psi-z-overlay` is unused by
    Dialog — the native top layer outranks every z-index. A Tooltip inside
    the Dialog works (same top-layer subtree); nothing outside can overlay
    it. This resolves the composition-contracts spec's "revisit when
    Dialog's slots.json is authored" trigger via the escalation ladder's
    first rung: allowlist exclusion + guidance, no `renderTarget` axis.

- **D45 adoption — first authored slot contracts, merged into the
  manifest.** Three pieces, exactly per the composition-contracts spec:

  1. `packages/react/src/Dialog/slots.json`:
     `title` — accepts `contracts: ["inline-content"]`, cardinality `0..1`;
     `body` — open (accepts any), `0..*`;
     `footer` — accepts `components: ["Button"]` +
     `contracts: ["inline-content"]`, `0..*`.
  2. `packages/react/src/contracts.json`, seeded honestly small:
     `interactive: ["Button", "IconButton"]`,
     `inline-content: ["Tag", "IconButton"]`.
  3. `emit-manifest.ts` merges: every component entry gains `slots` — from
     its `slots.json` when present, else an explicit `"slots": []` (absence
     is explicit, per D45). The build **throws** on a slot or contract
     naming an unknown component — the D48 conformance posture arriving
     early for this slice. MCP `get component:Dialog` returns the slot
     contract with zero MCP changes.

## Architecture

```
packages/react/src/Dialog/Dialog.tsx        — component (native <dialog>, sync effect)
packages/react/src/Dialog/dialog.module.css — surface, widths, motion, ::backdrop
packages/react/src/Dialog/slots.json        — D45 slot contract (authored)
packages/react/src/Dialog/Dialog.test.tsx   — RTL suite (below)
packages/react/src/Dialog/Dialog.stories.tsx— states: confirm/form/no-title/forced-choice
packages/react/src/contracts.json           — D45 named contracts (authored)
packages/react/scripts/emit-manifest.ts     — slots merge + dangling-ref gate
packages/tokens/src/components/dialog.ts    — component tokens
```

Component tokens (`--psi-dialog-*`): `bg: var(--psi-bg-secondary)` (elevated
surface — Card is transparent-on-canvas, Dialog is not), `border:
var(--psi-border-faint)`, `backdrop: var(--psi-scrim-heavy)`, `title-fg:
var(--psi-fg-primary)`. Radius (`--psi-radius-12`), padding
(`--psi-space-24`), and motion bind the global scales directly in the CSS
module. Width classes come from the `400 | 560 | 720` union.

Generated artifacts are free and gated: TSDoc one-liner → manifest/docs/MCP
brief (non-empty description test-gated), a11y-meta entry (Esc behavior,
native focus trap note), docs-drift counts go 12 → 13, Storybook story
enrolls the VR suite (baselines via the CI-artifact loop).

## Testing

- RTL: `open` syncs `showModal()`/`close()` (jsdom supports `<dialog>`);
  all three `onClose` reasons fire with the right string; `aria-labelledby`
  points at the rendered title; `dismissible={false}` renders no close
  button and swallows Esc + backdrop; backdrop-click detection (click
  target === the dialog element) doesn't fire for clicks inside the panel;
  scroll lock applied while open and restored after close; footer renders;
  width class per union value.
- Manifest: merge test — Dialog's entry carries the authored slots and
  every other component carries `"slots": []`; a dangling-ref fixture (slot
  naming an unknown component) must throw the build.
- Axe: with title, with `aria-label` only, `dismissible={false}` — zero
  violations.
- VR: story baselines (light/ember) from the CI artifact, per the
  documented loop.

## Release mechanics

Ships in 0.5 with Field (D49): extend the existing staged changeset (or add
a sibling) — minor × psi-react (new component + manifest slots field) and
psi-tokens (new dialog tokens). After 0.5 releases, the D47 example
`gaps: ["Field", "Dialog"]` resolves fully — patterns (HAN-15) unblock.

## Out of scope

- Non-modal, drawer, and sheet variants — separate demand-driven decisions.
- `role="alertdialog"` — revisit with the D47 destructive-confirm pattern
  if agent evals show announcement gaps.
- Nested-dialog guidance beyond "the top layer stacks them natively".
- The full D48 contract validator and D47 pattern files — HAN-15, after 0.5.
- Tooltip-inside-Dialog documentation beyond the top-layer note above.
- Scrollbar-gutter compensation for the scroll lock — accept the reflow;
  revisit only if it visibly jars in the demo apps.
