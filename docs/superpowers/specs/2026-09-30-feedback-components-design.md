# Feedback that is not a toast: `Banner`, `InlineAlert`, `Skeleton`, `CopyButton` (D86)

Date: 2026-09-30. Status: **In progress** on branch `d86-feedback-components`.

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

To be filled in when implemented. Tests that go red first, per component:
renders its anatomy; has no `role`, no `aria-live` and no `role="alert"`;
axe clean. `CopyButton`: calls `writeText` with `value`, then
`onCopy("copied")`; a rejected `writeText` gives `onCopy("failed")`; no
clipboard API gives `onCopy("failed")`. `Skeleton`: `aria-hidden`; in a
browser under reduced motion its animation duration is 0.01ms and its
animation name is `none`. The status maps: `Toast`'s existing tests pass
unchanged after the move.

## Consequences

To be filled in when implemented.
