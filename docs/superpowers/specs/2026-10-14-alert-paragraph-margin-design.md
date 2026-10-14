# Banner and InlineAlert set the margins of the paragraphs in their body (D95)

Date: 2026-10-14. Status: **Implemented** on branch `d95-alert-paragraph-margin`.

Provenance: the first item of the Psi 0.23 portal handoff
(`psi-handoffs/2026-10-14-psi-0.23-portal-handoff.md`, brief N5). The portal
renders every alert message as a `<p>`. In `Banner` and `InlineAlert` each one
keeps the browser's default margins, so the portal adds `psi-m-0` to every
paragraph, a rule written into three of its component specifications.

The number is the first free `## Decisions` entry when this branch started
(D94 was the highest). The 0.22 handoff proposed D95 for its tier-2 dialog
brief. That brief has not started, so it takes the next free number when it
does.

## What's there today

1. **Both components render `children` inside `<div className={styles.body}>`**,
   after the visually hidden status prefix and the optional `<strong>` title
   (`Banner.tsx`, `InlineAlert.tsx`). `.body` sets `min-width: 0` and nothing
   else (`banner.module.css`, `inline-alert.module.css`).
2. **A `<p>` child keeps the user agent's `margin-block: 1em`.** At the
   body's 14px font that is 14px above and 14px below. The first line sits
   about 14px below the top of the icon, and the alert is about 28px taller
   than the same message as bare text. Two paragraphs are 14px apart (margins
   collapse).
3. **No story passes a paragraph**, so no baseline shows it. No app in this
   repository renders `Banner` or `InlineAlert`.

## Decisions

- **D95 — A paragraph in the body of a `Banner` or an `InlineAlert` has no
  block margin, and consecutive paragraphs are 8px apart.**
  - **`.body > p { margin-block: 0; }`** in both modules. A paragraph's first
    line starts on the icon's line, exactly where bare text starts, and the
    alert ends where its last line ends.
  - **`.body > p + p { margin-block-start: var(--psi-space-8); }`** in both
    modules. Separate paragraphs still read as separate: with a 20px line
    height and no gap, a paragraph break is invisible unless the previous
    line happens to be short. 8px is a clear break without spreading the
    alert out. It is the spacing scale, as the modules' own `gap` and
    `padding` already are, and `--psi-space-*` binds margins
    (`psi/token-scopes`).
  - **Direct children only.** `.body > p` reaches the paragraphs the caller
    passes as the message. It does not reach a `<p>` nested inside another
    component or element the caller puts in the body, which keeps its own
    styling.
  - **No API change, no new token.** Both components keep their props, and
    bare-text children render exactly as before.

  **Why this is a fix, not a new default.** The margin was never a Psi value.
  Psi's body is a `div` with `min-width: 0` and nothing else, every Psi story
  renders the body as bare text, and every documented example does too. A
  paragraph child gets the browser's margin only because Psi never set one,
  and the result contradicts the component's own geometry: the text no longer
  lines up with the icon beside it. The one known consumer that passes
  paragraphs, the portal, strips the margin by hand on every one. A consumer
  who relied on the browser margin gets a tighter alert, aligned to its icon.
  That is the layout the component draws for bare text, so it is a correction
  rather than a new design.

  **Overriding it.** Since D94, component CSS sits in `@layer
  psi.components`, below `psi.utilities`. A utility on a paragraph
  (`psi-m-0`, `psi-my-*`) therefore beats both rules without a specificity
  fight, and so does any unlayered consumer rule, such as a class of the
  consumer's own with `margin-block-start: 16px`. A consumer that wants a
  different paragraph gap, or a different gap before one particular line,
  sets it on that paragraph. Psi has no single-side margin utilities, so a
  gap above one line only is the consumer's own class.

  Weighed and not taken:

  - **Zero gap between paragraphs.** It is what the portal's `psi-m-0` gives
    today. Not taken: the brief's own reason for passing paragraphs is that a
    message can have more than one, and with no gap a break between two
    paragraphs is not visible. A consumer that wants zero puts `psi-m-0` on
    the later paragraphs, as it does today.
  - **A component-owned token** (`--psi-banner-paragraph-gap`,
    `--psi-inline-alert-paragraph-gap`). No consumer has asked to retune it
    per theme, and a per-paragraph utility already covers a per-use change.
    Add one if a theme needs a different gap.
  - **Every direct child (`.body > *`), or the lobotomized owl
    (`.body > * + *`).** It would also strip margins from lists, headings or
    a consumer's own element, and put an 8px gap after the title, which today
    sits directly on the message. Nothing asks for that. Lists keep the
    browser's margins until a consumer needs otherwise.
  - **Any descendant `p` (`.body p`).** It would reach into components and
    markup the caller nests in the body.
  - **Reset the title gap as well.** The title is a block `<strong>` with no
    margin and sits directly on the first line of the message. That is
    unchanged, so a title followed by a paragraph renders like a title
    followed by bare text.

## Consequences

- An alert whose children are paragraphs renders like one whose children are
  bare text, plus 8px between paragraphs.
- The portal can drop `psi-m-0` from its three specifications and from
  its error panel once it pins the release. Its open design question about
  the gap before the Correlation Identifier line (WEB-340) gets a default
  (8px, if that line is a paragraph) and keeps the override above.
- No existing baseline should move: no story passed a paragraph. Any VR diff
  outside the new stories is a defect to explain.

## Verification

- **Tests first**, red before the change, on assertion:
  - `Banner.test.tsx` and `InlineAlert.test.tsx` read each module's rules
    (jsdom does no layout, as in `Toolbar.test.tsx`): `.body > p` sets
    `margin-block: 0`, and `.body > p + p` sets `margin-block-start:
    var(--psi-space-8)`.
  - `apps/storybook/vr/alert-paragraph.interaction.spec.ts` measures in a
    browser, for each component: a paragraph's top is the top of the body,
    the body's top is the icon's top, and the second paragraph starts 8px
    below the first one's bottom.
- **New stories**, `WithParagraph` and `WithParagraphs` for each component.
  Their VR baselines come from CI.
