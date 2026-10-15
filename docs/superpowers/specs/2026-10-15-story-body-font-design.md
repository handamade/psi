# Stories that set type the way an app does (D107)

Date: 2026-10-15. Status: **Implemented** on branch `d107-story-body-font`.

Provenance: the UI polish triage after 0.26.0 (candidate B.2). VR renders of
Dialog, Panel and the `empty-state` preset showed body text in a serif face.

The number is the first free `## Decisions` entry when this branch started.
D105 and D106 are claimed by their open PRs (#143, #144).

## What's there today

1. **Psi ships no body font, on purpose.** Theme CSS never paints the page
   (HAN-38); the consumer's app root paints `--psi-bg-primary` itself.
   Components set their own type (`font: var(--psi-text-*)`). `promo.css`, the
   one app in the repo, sets its body font in `@layer psi.base`.
2. **The Storybook preview set background and colour only.** Every text a
   story places outside a Psi component's own type inherits the browser's
   default: serif for text, Arial for native buttons, `monospace` for `<code>`.
3. **Measured: 43 of 197 stories** render visible text outside Psi's four font
   stacks: every Dialog story, Panel, Card, Tabs, AppShell, NavBar, the token
   pages, five presets, and the Tooltip stories (native buttons). The token
   pages also hardcode `fontFamily: "monospace"` inline.
4. **The consumer contract did not say to set the font.** `llms.txt` told
   consumers to paint the background; it said nothing about type.

## Decisions

- **D107 — the Storybook preview sets the app-root type a consumer sets, and
  the consumer contract says so. Psi's surfaces do not set a body font.**
  - **The preview, in `@layer psi.base`:** `body` takes
    `font: var(--psi-text-14-20-regular)`, beside the background and colour
    `html, body` already set. **On `body`, never `html`.** Psi's scales are
    rem; the first version put the font on `html, body`, which made the root
    14px and shrank every control and gap by an eighth. Seven existing
    interaction specs caught it (Input 28px for 32, `psi-gap-24`'s row gap
    14px for 16, alert paragraphs 7px apart for 8). The contract says so
    too. Native `button, input, select, textarea` take `font: inherit`, and
    `code, kbd, samp, pre` take `var(--psi-font-mono)`, as an app's reset
    does. The layer keeps Psi's component layer winning (D94), which a test
    of every story confirms.
  - **The token pages bind `var(--psi-font-mono)`** instead of
    `fontFamily: "monospace"`.
  - **The contract:** `packages/react/llms.txt` and the README's new "App root"
    section say to set background, colour and font at the app root in
    `@layer psi.base`, with `font: inherit` for native controls.

  **Why not set a font on Panel and Dialog?** It would fix 2 of the 43 stories
  and leave Card, Tabs, AppShell, NavBar and the token pages as they are. It
  would also override a consumer's own body face inside every surface, and the
  page's type is the consumer's decision, like its background. The stories
  were the defect: they showed what no real app looks like.

  **What this changes.** Nothing in a published stylesheet. Only the stories
  (and so their baselines) and the docs change.

## Consequences

- VR baselines of the 43 stories move, light and ember, and the token pages in
  all four themes.
- `story-font.interaction.spec.ts` fails any story that renders text outside
  Psi's stacks, so a future story with a native element or a hardcoded face is
  caught. It waits for Storybook's own `finished` render phase rather than
  `networkidle`: 1.4 minutes for 197 stories. A first version waited on
  `sb-show-main`, which is set before the story renders, and passed with the
  bug present; the spec records why.

## Verification

- **Tests first**: `apps/storybook/vr/story-font.interaction.spec.ts`
  (`@interaction`), red before the change on assertion (43 failed, 9 of them
  Dialog), green after (197).
- VR: CI's renders for the moved stories replace their baselines, each class of
  change explained in the PR.
