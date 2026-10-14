# A button sizes the icon inside it (D97)

Date: 2026-10-14. Status: **Implemented** on branch `d97-button-icon-size`.

Provenance: the third item of the Psi 0.23 portal handoff
(`psi-handoffs/2026-10-14-psi-0.23-portal-handoff.md`, brief N4). It closes
the backlog item "Icon sizing in Button" that D54–D55 deferred
(`2026-07-31-control-ramp-tokens-design.md`). The portal passes Psi's icon
components to `Button` as children and has no token to size them by.

The number is the first free `## Decisions` entry when this branch started.
D96 (the navigation tree's parent mark) is claimed by its open PR.

## What's there today

1. **Every Psi icon defaults to `size = 20`.** A consumer who passes
   `<IconPlus />` to a `Button` gets a 20px icon at every button size.
2. **Psi's own compositions draw 16** inside a control: `CopyButton`
   (whatever its `size`), `CursorPagination` (at 32 and 40) and `NavGroup`.
   The `IconLeading` story passes yet another set: 12, 14, 18 and 21.
3. **`Button` sizes no icon.** It insets a leading or trailing `svg` through
   `:has()` (D55), and the padding tokens are its only icon tokens. D54–D55
   recorded the decision to leave icon size to the consumer and put it on
   the backlog.

So there are three sizes in use for one role, and no token to name the
right one.

## Decisions

- **D97 — A direct `svg` child of a `Button` is sized by a per-size token,
  half the button's height: 12, 16, 20 and 24 at sizes 24, 32, 40 and 48.**
  - **Four `Button`-owned tokens**, `--psi-button-{24,32,40,48}-icon-size`,
    each `calc(var(--psi-button-{n}-height) / 2)`. They are derived from the
    height rather than restated, so a theme that retunes a button's height
    at the root moves its icon with it. As with D92's derived offset, the
    `calc()` resolves where it is declared: a retune on a narrower scope
    must set the icon size there too.
  - **`.size{n} > svg { inline-size: …; block-size: …; flex: none; }`.** A CSS
    width and height beat the `width` and `height` attributes an icon
    component writes, so the token wins over the icon's `size` prop *inside
    a button*. The prop still sizes an icon anywhere else. `flex: none`
    keeps the icon at its size when a long label squeezes the row (N3's
    label cap is next).
  - **Why half the height.** Two independent readings land on the same
    ramp. Half the control is the conventional proportion for an icon in a
    labelled control, and it is also the label's line height minus 4 (16,
    20, 24, 28 → 12, 16, 20, 24), so the icon sits inside the label's line
    box with 2px to spare on each side. It reproduces what Psi's own
    compositions already draw at their default size of 32 (16px). The ramp
    keeps the D55 inset (`6/8/12/16`) proportionate: the inset grows with the
    icon. A flat 16 at every size was weighed (below).
  - **Direct `svg` children only.** A wrapped icon (`<span><Icon/></span>`)
    is not sized, exactly as it gets no D55 inset. That is the documented
    escape hatch, and it fails safe.
  - **`IconButton` does not bind the ramp.** Its icon is its whole content,
    and Psi draws it at 20 in a 32 button (the `Dialog` and `Banner` close
    buttons). Half the height would shrink every icon-only button. Whether
    `IconButton` gets an icon token of its own is a separate decision.

  **Why this is a fix, and what it changes.** It changes what consumers see,
  on purpose (the user chose the default over an opt-in token on
  2026-10-14). Every consumer who passes an icon to a `Button` gets the
  ramp's size instead of the icon's own. That is 16 instead of 20 at the
  default size of 32. The argument for doing it anyway: the old size was
  never a Psi value. It was the icon component's generic default, chosen
  for an icon on its own. Psi's own buttons already contradicted it by
  passing 16, and each consumer had to pick a number with no token to bind
  it to. That gave the 20/16/14 spread above. One ramp, owned by the
  control, is what D54 did for padding and gap.

  Weighed and not taken:

  - **An opt-in token, unset by default.** No rendering would change, but
    icons inside buttons stay inconsistent unless every consumer opts in,
    and the portal's ask (a token to bind) is met either way. Not taken by
    the user's choice.
  - **A flat 16 at every size.** It matches Psi's compositions at any size,
    but a 16px icon beside a 48 button's 18px label reads undersized. That is
    the same complaint D54 recorded about Select's fixed 12px chevron.
  - **Size the icon from the font (`1.25em` or similar).** The label ramp is
    a `font` shorthand, so the em is the label's, but an em size gives
    fractional pixels at 14px and 18px (17.5, 22.5) and blurs strokes.
  - **Binding `IconButton` too.** See above. It would move every icon-only
    baseline for no consumer ask.
  - **A shared `--psi-control-{n}-icon-size`.** Only `Button` has an icon
    slot today. Promote it to the control ramp when `Input` or `Select`
    gains a leading icon.

## Consequences

- An icon passed straight into a `Button` renders at 12, 16, 20 or 24,
  whatever its `size` prop. Its `size` prop matters only outside a button,
  or inside a wrapper.
- `CopyButton` now draws its icon at the ramp's size for its own `size`: 16
  at 32 as before, but 12, 20 and 24 at 24, 40 and 48. `CursorPagination`
  at 40 draws 20 instead of 16.
- **Expected VR movement**, each a direct consequence of the ramp: any story
  with an icon in a `Button` at a size where the old icon differed from the
  ramp. This includes `Button/IconLeading` (12, 14, 18, 21 become 12, 16,
  20, 24), and `CopyButton` and `CursorPagination` at sizes other than 32.
  Each moved baseline is listed in the PR with its reason. Any diff not
  explained by an icon inside a `Button` is a defect.

## Verification

- **Tests first**, red before the change, on assertion:
  - `button-tokens.test.ts`: each `{n}-icon-size` is exactly
    `calc(var(--psi-button-{n}-height) / 2)`.
  - `Button.test.tsx` reads the module's rules (jsdom does no layout):
    each `.size{n} > svg` sets `inline-size` and `block-size` to its token,
    and `flex: none`.
  - `apps/storybook/vr/button-icon.interaction.spec.ts` measures in a
    browser: in a new story, `IconSizes`, a `Button` at each size holding a
    20px icon renders it at 12, 16, 20 and 24, and an `IconButton` beside it
    keeps its 20.
- The existing D55 inset tests stay green: the inset selectors are
  untouched.
