# A cap on the width of a button's label (D98)

Date: 2026-10-15. Status: **Implemented** on branch `d98-button-label-max-width`.

Provenance: the fourth item of the Psi 0.23 portal handoff
(`psi-handoffs/2026-10-14-psi-0.23-portal-handoff.md`, brief N3). The portal's
account trigger is a quiet `Button` with a user icon before the signed-in
operator's display name. A long name widens the header and is never
truncated, and the portal has no token to bind a cap to.

The number is the first free `## Decisions` entry when this branch started
(D97 was the highest).

## What's there today

1. **`.button` sets `white-space: nowrap`** and no maximum width. A label
   grows the button without limit.
2. **`Button` renders its children as they are.** A bare text label becomes
   an anonymous flex item, which CSS cannot select, so nothing can truncate
   it. `text-overflow` needs an element that clips its own text.
3. **Psi already asks for a wrapped label in one case.** A trailing icon must
   follow an element (D55, D85): `<span>Next</span><Icon/>`.
   `CursorPagination` and `CopyButton` wrap their labels that way.

## Decisions

- **D98 — A `Button`'s label, when it is a direct `<span>` child, is capped
  by `--psi-button-label-max-width` (default `none`) and truncated with an
  ellipsis past the cap.**
  - **One `Button`-owned token, `--psi-button-label-max-width: none`.** It
    applies at every size: the cap is about the layout around the button
    (a header, a toolbar), not the button's own scale. A consumer sets it on
    its own class, as it sets `--psi-button-{n}-padding-inline-icon` today:
    `.account { --psi-button-label-max-width: 12rem; }`.
  - **`.button > span { max-inline-size: var(--psi-button-label-max-width);
    overflow: hidden; text-overflow: ellipsis; flex: none; }`.** The span
    clips its own text, so the ellipsis is drawn at the cap. `flex: none`
    keeps the span from shrinking below its capped content size. A scroll
    container's automatic minimum width is 0, so without `flex: none` the
    `overflow` would let a label shrink in a tight row where today it
    cannot. With the default `none`, the span is exactly its content width,
    as the anonymous text was.
  - **The label must be a `<span>`, as for a trailing icon.** Write
    `<Button><IconUser aria-hidden="true" /><span>{name}</span></Button>`. A bare
    text label is not capped. That is the same convention D55 and D85
    already document, so there is one rule for "wrap the label".
  - **The accessible name stays whole.** The full text is still in the DOM,
    so a screen reader reads the whole name and the button's name in the
    accessibility tree is not truncated. Only the painting is cut.
  - **No `title` from Psi.** A `title` tooltip shows only to a mouse, never
    to the keyboard or to touch, and it repeats the name to some screen
    readers. Whether a truncated name needs a visible full form, and in
    what form (a `Tooltip`, a menu header), is the consumer's design. The
    portal's account trigger opens a menu that can show the full name.

  **Why this changes no default.** The token defaults to `none`, so no label
  is capped. With the cap off, the CSS on a direct span does nothing
  visible: `max-inline-size: none` caps nothing, an ellipsis is drawn only
  on overflow, and `flex: none` keeps the span exactly as wide as an
  anonymous text item already was. `overflow: hidden` could clip ink that
  spills outside the span's box, such as an italic overhang or a tall
  diacritic above the 20px line. VR is the check for that: any diff in an
  existing story is a defect to explain.

  Weighed and not taken:

  - **Button wraps bare text children in a span itself.** No consumer would
    need to wrap. But it changes the DOM of every button, and it changes
    D55's selectors: an unwrapped trailing icon would start matching the
    trailing-inset rule. That is arguably a fix, but it is a fix nobody
    asked for, and it moves baselines. Revisit as its own decision.
  - **Cap the button itself** (`max-inline-size` on `.button`).
    `text-overflow` does not apply to a flex container, so the label would be
    clipped with no ellipsis, and the icon could be cut too.
  - **A cap per size** (`--psi-button-{n}-label-max-width`). The cap is set
    by the surrounding layout, so one value serves every size. A consumer
    who wants different caps sets the token on different classes.
  - **A `maxLabelWidth` prop.** A token is what the brief asks for and what
    the portal binds. A prop would add API for a value CSS already carries.

## Consequences

- A consumer can cap a label in one declaration, and the label then ends in
  an ellipsis instead of widening its row.
- A `<span>` directly inside a `Button` now has `overflow: hidden` and
  `flex: none`. With the cap off, that should not change any rendering.
- **Expected VR movement:** only the new story. No existing baseline should
  move.

## Verification

- **Tests first**, red before the change, on assertion:
  - `button-tokens.test.ts`: `label-max-width` is `none`.
  - `Button.test.tsx` reads the module's rules: `.button > span` sets
    `max-inline-size: var(--psi-button-label-max-width)`, `overflow:
    hidden`, `text-overflow: ellipsis` and `flex: none`. A capped label's
    button keeps the full text as its accessible name.
  - `apps/storybook/vr/button-label.interaction.spec.ts` measures in a
    browser, in a new story `LabelMaxWidth`. With the token set to 160px, the
    long label's span is 160px wide, its text overflows it, and the computed
    `text-overflow` is `ellipsis`. The same button without the token is as
    wide as its full label.
