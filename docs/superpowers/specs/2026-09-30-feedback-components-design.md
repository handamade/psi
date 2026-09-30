# Feedback that is not a toast: `Banner`, `InlineAlert`, `Skeleton`, `CopyButton` (D86)

Date: 2026-09-30. Status: **Implemented** on branch `d86-feedback-components`.

Provenance: the fifth item of the Psi 0.21 portal handoff
(`docs/superpowers/plans/2026-09-30-psi-0.21-portal-handoff.md`, brief D86).
Two of the portal's rules bind here: **one announcer** — the application's
one `ToastRegion` is the only writer of a live region — and **every control
carries visible text**. The four components below are what a screen *shows*:
a page-level message, a message inside content, a loading placeholder, and a
button that copies a value. None of them announces anything.

## What's there today

1. **The only status message is `Toast`**: transient, in a corner, on the
   top layer, always inside a live region. A message that must stay on the
   page (the backend is stale; the form was rejected) has no component.
2. **`Toast` owns the status vocabulary** — the four variants' icons and
   hidden status words (`Toast.tsx:32-44`) — as module-local maps. A second
   component with the same variants would copy them.
3. **`fgSuccess` and `fgWarning` are scoped `text` only**; `fgDanger` is
   `text` + `border` (D46), because `Input`'s error border needed it. A
   success or warning border cannot be drawn from a semantic token today.
4. **The contrast matrix gates `fgPrimary` on `fillTintAccent`** (D62's
   selected row) and the three status foregrounds on their tints, but not
   `fgPrimary` on `fillTintSuccess`, `fillTintWarning` or `fillTintDanger`:
   no component has put body text on those surfaces.
5. **No loading placeholder** exists, and every infinite animation Psi
   might ship has a problem D30 does not solve: zeroing a duration token
   turns a *finite* animation into a jump to its end state, but an infinite,
   alternating animation with a 0.01ms period samples a different phase on
   every frame — it flickers rather than stops.
6. **`IconCopy` exists** (D74's set), and nothing uses it.

## Decisions

- **D86 — Four presentational feedback components, none of which writes a
  live region.** Each one's docs say so first: announcing stays the
  application's.
  - **The status vocabulary moves to `Toast/status.ts`** — `statusIcons` and
    `statusPrefix`, keyed by the status axis `neutral | success | warning |
    danger` — and `Toast`, `Banner` and `InlineAlert` all read it. One set of
    icons, one set of words, one `statusLabel` contract (D83): a string
    replaces the word, `null` drops it.
  - **`Banner`** — a full-width, page-level message.
    - Props: `variant` (default `neutral`), `title?`, `children`, `action?`
      (a ghost `Button`), `onDismiss?`, `statusLabel?`, `className`, `ref`,
      and HTML attributes spread onto the root `<div>`. No `role`.
    - Anatomy: the variant's icon (`aria-hidden`), the hidden status word,
      the title (`14-20-medium`) and body (`14-20-regular`), the action, and
      an `IconButton` *Dismiss* when `onDismiss` is given.
    - Tinted surface of the variant, no radius, no border: it spans the page
      edge to edge.
    - Tokens `--psi-banner-*`: `bg-neutral` (`fill-neutral3`), `bg-success`,
      `bg-warning`, `bg-danger` (the `fill-tint-*` family), `fg`
      (`fg-primary`), `icon-fg-*` per variant (`fg-secondary` for neutral,
      the status foreground otherwise).
  - **`InlineAlert`** — the same message inside content: above a form, in a
    panel.
    - Same props as `Banner` without `onDismiss`. Not `role="alert"`, despite
      its name; its docs say so first.
    - Tinted surface, a 1px border in the variant's foreground
      (`border-neutral` for neutral), radius `--psi-radius-8`.
    - Tokens `--psi-inline-alert-*`: `bg-*` and `icon-fg-*` as `Banner`,
      `fg`, `border-neutral`, `border-success`, `border-warning`,
      `border-danger`, `radius`.
    - **`fgSuccess` and `fgWarning` gain the `border` scope**, in every theme
      that declares them, on the D46 precedent that a cross-family binding
      which is a design decision carries both scopes. `fgDanger` already had
      it for the same reason.
  - **`Skeleton`** — a loading placeholder.
    - Props: `variant: "text" | "block"` (default `text`), `lines?` (text
      only, default 1), `size?` (block height from the size scale, default
      40), `className`, HTML attributes. Always `aria-hidden="true"`; the
      consumer sets `aria-busy` on the region it stands for. Width fills the
      container; no `style` prop.
    - A pulse on opacity, `animation` driven by `--psi-duration-600` and
      `--psi-ease-in-out`, infinite and alternating. **And**, because of
      item 5, `@media (prefers-reduced-motion: reduce)` sets
      `animation: none` in the component's own CSS. The duration token alone
      would flicker; the media query is what stops it. The test in the brief
      ("its animation duration resolves to 0 under reduced motion") is kept,
      and a browser test adds "and its animation name resolves to `none`".
    - Tokens `--psi-skeleton-*`: `bg` (`fill-neutral4`), `radius`
      (`radius-4`).
  - **`CopyButton`** — copies a value.
    - Props: `value`, `label` (default *Copy*), `size` (`24 | 32 | 40 | 48`,
      default 32), `variant` (default `ghost`), `onCopy?(result: "copied" |
      "failed")`, `className`. Renders a `Button` with `IconCopy` before a
      `<span>` label — visible text, the icon reinforcing it.
    - On press it calls `navigator.clipboard.writeText(value)` and reports
      `"copied"` on resolve, `"failed"` on reject or when the clipboard API
      is absent. It changes neither its label nor its icon and announces
      nothing: the portal speaks the result through its announcer. The
      consumer who wants a visible confirmation raises a `Toast`.
  - **Contrast gate:** `fgPrimary` on `fillTintSuccess`, `fillTintWarning`
    and `fillTintDanger` at 4.5 join the matrix, because `Banner` and
    `InlineAlert` set body text there. The tints are 12–15% of the status
    foreground over the canvas, so every shipped theme clears it by a wide
    margin; a consumer theme built with `psi-theme` is now held to it too.
  - **Patterns:** `page-banner` (a `Banner` above the page content, with a
    *Refresh* action), `form-feedback` (an `InlineAlert` above a form holding
    a message and a `CopyButton` for an identifier), `loading-table` (a
    `Table` with `aria-busy` whose body rows hold `Skeleton` lines) and
    `copyable-id` (a `DescriptionList` item: the identifier and a
    `CopyButton`). 41 components, 20 patterns.

## Verification

- **How it was built.** The four component tasks and the patterns task were
  executed by five Sonnet subagents, one after another, from the plan's
  per-task briefs; this session wrote the spec, the plan and Task 0, reviewed
  each commit, resolved the merge with D85, and did Task 6. Every agent
  reported its red run before its green one.
- **Tests first**, per the agents' reports and the commits:
  - Task 0: the scope pins and the three contrast pairs, 2 tests red;
  - `Banner` 23 + 4 token tests, `InlineAlert` 23 + 4, `Skeleton` 10 + 4,
    `CopyButton` 11 — each file red on the missing module, then green;
  - the patterns: the id lists red on the four missing files.
- **What the agents changed beyond their briefs**, each reviewed here:
  - `Skeleton`'s text line takes its 12px from `padding-block:
    var(--psi-space-6)` rather than `height: var(--psi-space-12)`: the plan's
    line failed `psi/token-scopes`, which scopes the space family to gap,
    padding and margin. Correct, and the CSS says why;
  - the D72 childless list gained `Skeleton` and `CopyButton`;
  - the MCP overview-envelope tests (D61) synthesise patterns on top of the
    real ones and went past the edge at 20 real. The agent re-measured the
    edge — the component floor holds through 23 patterns and breaks at 24 —
    and lowered the synthetic counts to keep the same margins (21 and 39
    total). See Consequences.
- **In a browser** (Chromium 149, built Storybook): every component and
  preset in light and ember, looked at; on every one of those ten pages the
  count of `[aria-live], [role=status], [role=alert], [role=log]` is **0**.
  `Skeleton` with motion allowed animates `skeleton-pulse` for `0.6s`; under
  reduced motion its animation name is `none`, its opacity stays `1` across
  frames, and `--psi-duration-600` resolves to 0.01ms. Pinned in
  `apps/storybook/vr/skeleton.interaction.spec.ts`.
- **axe:** seven new cases, no violations.
- **The five gates** green: 2431 tests in 103 files (2344 in 96 before), docs
  drift at 41 components and 20 patterns, site gate 9 of 9. Interaction set
  182 of 182, the D82 sweep over the 22 new stories included.

## Consequences

- **Visual regression: 44 new baselines, none changed.** Eighteen new
  stories and four new presets, in light and ember, from CI run
  36780478405's artifact; the other 480 screenshots passed unchanged.
- **Consumer themes are held to three more contrast pairs** and may bind
  `fgSuccess`/`fgWarning` to borders. A theme built with `psi-theme` that
  fails `fgPrimary` on a status tint fails its build now; every shipped
  theme clears it by a wide margin.
- **The MCP overview envelope has three patterns of headroom.** The real
  catalog is 20; the component floor breaks at 24. D87 adds one and D88
  adds one, reaching 22. The next pattern cycle after this release should
  revisit the D61 budget before adding more.
- **`InlineAlert` is not an alert.** Its name follows what a page shows; a
  consumer who wants it spoken routes the same text through the announcer.
- **`CopyButton` gives no visible confirmation.** A consumer outside the
  portal who wants one raises a `Toast` from `onCopy`.
- **The portal** shows a `Banner` when its data is stale, an `InlineAlert`
  above a rejected form, `Skeleton` rows while a page loads with
  `aria-busy` on the body, and `CopyButton` beside identifiers — and speaks
  each event through its one announcer.
