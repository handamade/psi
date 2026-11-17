# A segmented control: one pill, two jobs (D132)

**Status:** accepted · **Date:** 2026-11-17 · **Decision:** D132

## Problem

The homepage redesign draws one pill control in four places: the Light / Dark /
System switch in the header and the phone menu, Map / Trace on the "one source,
every surface" section, Preview / Code on the Canopy demo, and the light / dark /
acme / ember theme picker. The homepage is to be built only from Psi
components, and Psi has no such control. The gap analysis
(`docs/research/2026-10-29-component-gap-analysis.md`, row 10) lists it as
missing: `Tabs` and `Toolbar` only approximate it.

The look: a rounded pill outline holding 2–4 short text segments. The selected
segment is filled with the soft accent tint, in accent text.

The four uses split into two jobs with different semantics:

1. **Switching views of content.** Map / Trace and Preview / Code change what a
   region below shows. That is the tab pattern: a `tablist`, roving arrow keys,
   and `aria-controls` pointing at panels.
2. **Picking a setting.** Light / Dark / System and the theme picker choose one
   value from a set and apply it. That is the radio pattern: a `radiogroup`
   where the arrow keys move and check.

The owner chose one standalone component over a `Tabs` variant and a
`RadioGroup` variant.

## Decisions

- **D132 — `SegmentedControl` and `Segment`: a pill of 2–4 segments, a radio
  group on its own and the tab list inside `Tabs`.**

  ### API

  ```tsx
  // A setting: a radio group.
  <SegmentedControl aria-label="Color scheme" value={scheme} onValueChange={setScheme}>
    <Segment value="light">Light</Segment>
    <Segment value="dark">Dark</Segment>
    <Segment value="system">System</Segment>
  </SegmentedControl>

  // Views of content: the tab list of a Tabs.
  <Tabs value={view} onValueChange={setView}>
    <SegmentedControl aria-label="Diagram">
      <Segment value="map">Map</Segment>
      <Segment value="trace">Trace</Segment>
    </SegmentedControl>
    <TabPanel value="map">…</TabPanel>
    <TabPanel value="trace">…</TabPanel>
  </Tabs>
  ```

  `SegmentedControl` props:

  - `value?: string`, `onValueChange?: (value: string) => void`. Controlled
    only, like `Tabs` (D67) and `NavGroup`: there is no `defaultValue`. Both are
    required on their own. Inside `Tabs` both come from `Tabs` and passing
    either is an error. The types mark them optional because one component
    serves both cases; the runtime checks below hold the rule.
  - `size?: 24 | 32 | 40`, default `32`. The control's outer height, so a 32px
    segmented control lines up with a 32px `Button`. No 48: the pill is a
    compact switch, and 48 is the hero button size.
  - `fill?: boolean`, default `false`. Stretch to the container and give every
    segment an equal share (see Overflow).
  - `aria-label` / `aria-labelledby`. One of them is needed: both the
    `radiogroup` and the `tablist` need a name.
  - `className`, `ref` (to the root `<div>`), and other HTML attributes on the
    root.

  `Segment` props: `value: string`, `children: ReactNode` (the label: one or two
  words), `disabled?: boolean`, `className`, `ref` (to the `<button>`).

  ### Semantics: chosen by context, not by a prop

  There is no `mode` prop. What makes a set of segments tabs is that they
  control panels, and in Psi a panel is a `TabPanel` inside `Tabs`, paired by
  value. So:

  - **On its own** the root is `role="radiogroup"`, and each `Segment` is a
    `<button type="button" role="radio" aria-checked>`.
  - **Inside `Tabs`** the root is `role="tablist"` (with
    `aria-orientation="horizontal"`), and each `Segment` is a
    `<button type="button" role="tab" aria-selected aria-controls>`, with the
    id and `aria-controls` that `Tab` uses (`tabId` / `panelId`), so the
    `TabPanel` of the same value is labelled by the segment. It takes the place
    of `TabList`; `Tab` and `TabList` are not used with it.

  A prop would let the two disagree: `mode="tabs"` with no panels, or
  `mode="radio"` inside `Tabs` beside panels that nothing controls. Reading the
  context makes the right structure the only one that renders.

  Misuse throws, the way `Tab` outside `Tabs` throws (D67), because each
  failure would otherwise be silent:

  - On its own, without `value` or without `onValueChange`: "pass value and
    onValueChange, or render it inside `<Tabs>`".
  - Inside `Tabs`, with `value` or `onValueChange`: "Tabs owns the value".
  - A `Segment` outside a `SegmentedControl`.

  Why `<button role="radio">` rather than native radios, as `RadioGroup` uses
  (D104): one DOM shape serves both modes, and the radio mode is for settings
  that apply at once, not form fields. A segmented control does not submit with
  a form and does not join a `Field`. A choice that is a form value is a
  `RadioGroup`.

  ### Keyboard

  One tab stop for the control (roving tabindex), as in `Tabs`. Selection
  follows focus in both modes: automatic activation is the APG default for tabs
  whose panels are already rendered, and arrow keys check a radio in the APG
  radio pattern.

  | Keys | Radio mode | Tabs mode |
  | --- | --- | --- |
  | Tab | Enters on the checked segment, leaves the control | Same, on the selected segment |
  | → / ↓ | Next enabled segment, wrapping; selects it | → only (↓ falls through, as in a horizontal `TabList`) |
  | ← / ↑ | Previous enabled segment, wrapping; selects it | ← only |
  | Home / End | First / last enabled segment; selects it | Same |
  | Space / Enter | Selects the focused segment (native button) | Same |

  Radio mode takes both axes because the APG radio group does; tabs mode keeps
  `TabList`'s horizontal keys so a segmented tab list and an underlined one
  behave the same.

  The keyboard is `useTabsKeyboard` (D67), taught two options: the selector for
  its items and an `axes: "both"` setting. That hook's own comment names a
  third caller as the signal to share it; this is the second caller with the
  same behaviour, so it is shared rather than copied.

  Right-to-left: `Tabs` does not swap ← and → under `dir="rtl"`, and neither
  does this. It is a follow-up for both at once (see below), not a divergence.

  ### The tab stop (D93), shared

  `Tabs` picks the tab stop in its provider (D93): the selected tab when `value`
  names one (disabled or not), else the first enabled tab, else the first tab,
  with a development warning when `value` matches nothing. That logic moves out
  of `Tabs` into a hook, `useRovingStop(value, component)`, used by `Tabs` and by
  a standalone `SegmentedControl`. Inside `Tabs`, segments register with `Tabs`
  exactly as `Tab` does. `Tabs`' behaviour does not change; its tests stay as
  they are.

  ### Disabled segments

  `Segment disabled` sets `aria-disabled="true"`, not the `disabled`
  attribute (as `Tab` and `MenuItem` do, D53/D67): the segment stays in the
  accessibility tree, the arrow keys skip it, a click does nothing, and it shows
  in `fg-disabled`. It is focusable only when it holds the tab stop under D93.
  There is no control-wide `disabled`: no use asks for one, and a theme picker
  that cannot be used should not render.

  ### Look and tokens (`--psi-segmented-*`)

  The CSS module is `segmented.module.css`, so the stylelint plugin's namespace
  is `--psi-segmented-*`. Tokens live in
  `packages/tokens/src/components/segmented.ts`, pure indirection:

  | Token | Binds | Why |
  | --- | --- | --- |
  | `bg` | `bg-primary` | The track paints the canvas, so the selected tint always composites onto `bgPrimary`, the surface the contrast gate measures it on, even on a `Panel` (`bgSecondary`). Count's attention pill (D124) does the same. |
  | `border` | `border-neutral` | The pill's outline. It frames the group; the labels identify the segments, so it is decorative and not gated (a ghost button has no outline at all). |
  | `fg` | `fg-secondary` | Unselected label. |
  | `fg-hover` | `fg-primary` | Unselected label on hover. |
  | `bg-hover` | `fill-neutral3` | Unselected segment on hover. |
  | `selected-bg` | `fill-tint-accent` | The soft accent fill. |
  | `selected-fg` | `fg-accent` | Selected label. |
  | `selected-ring` | `fg-accent` | A 1px inset ring on the selected segment (below). |
  | `fg-disabled` | `fg-quaternary` | Not gated: disabled text is exempt from 1.4.3, as with `--psi-tabs-fg-disabled`. |
  | `focus-ring` | `border-focus` | With `--psi-focus-ring-width` and `--psi-focus-ring-offset-inset`. |
  | `radius` | `radius-full` | See "Shape". |
  | `inset` | `space-2` | Track padding: the gap between the outline and a segment. |
  | `24-height` … `40-height` | `control-{n}-height` | Outer height of the control. |
  | `24-padding-x` … `40-padding-x` | `control-{n}-padding-inline` | Segment padding: 8 / 12 / 16. |
  | `24-font` … `40-font` | `control-{n}-font` | 12/16, 14/20, 16/24, medium. |

  A segment's height is the control's height minus the outline (1px each side)
  and the inset (2px each side): 18 / 26 / 34.

  **Shape.** The brief asked for the control radius and the picture shows a
  pill; they disagree. `--psi-control-radius` is `radius-8` in every shipped
  theme, so binding it draws a rounded rectangle, not the pill. D56 already
  settles which wins: *"Tag and Switch stay `--psi-radius-full`: pill-ness is
  component identity, not theme expression."* A segmented control is a pill by
  identity in the same way, so `radius` binds `radius-full` and a theme that
  sharpens its controls does not square it. A consumer who wants it square sets
  `--psi-segmented-radius`. The segment's own radius is the same token, so it
  nests concentrically inside the 2px inset.

  **The selected state is more than a tint (WCAG 1.4.11).** The accent tint is
  12–15% of the accent over the canvas: against an unselected segment it
  measures far below the 3:1 that 1.4.11 asks of the visual information that
  identifies a state, and the label's colour change alone is colour only (1.4.1).
  So the selected segment also draws a 1px inset ring (`box-shadow: inset 0 0 0
  1px`) in `fg-accent`. `fgAccent` on `bgPrimary` is already gated at 4.5, so
  the ring clears 3:1 against the canvas around it in every theme without a new
  pair. The ring is drawn inside the segment so selecting never moves a pixel
  of layout.
  The key is `selected-ring`, not `selected-border`: a `-border` key is held
  by the D46 scope gate to border-scoped tokens, and `fg-accent` is scoped to
  text. An unsuffixed key is not scope-checked, the same posture as
  `focus-ring`. Found by the gate during D132.

  **Forced colours** drop both the tint and the box-shadow ring. There the
  selected segment paints `Highlight` / `HighlightText` with
  `forced-color-adjust: none`. These are system colour keywords, not theme
  colours, so they are not tokens. (An outline would also work, but the
  `psi/focus-ring` lint rule keeps `outline` for the focus ring alone.)

  **Contrast.** Every text pair is one the matrix already gates in all four
  themes, so no pair is added and the pinned pair count does not move:

  - unselected `fgSecondary` on `bgPrimary`; on hover `fgPrimary` on
    `fillNeutral3`;
  - selected `fgAccent` on `fillTintAccent` (composited onto `bgPrimary`, which
    the track guarantees);
  - the focus ring is the shared `border-focus`, drawn inset (D82) because the
    segments sit 0px apart inside the track and an outside ring would cross the
    outline.

  A token test (`segmented-tokens.test.ts`) reads the resolved values per theme
  and asserts the three text pairs at ≥4.5 and the ring at ≥3, so a future
  rebinding that leaves the matrix cannot drop below either.

  ### Overflow

  The control never wraps: a pill on two lines is no longer a pill.

  - By default the root is `inline-flex` with `max-inline-size: 100%`. Segments
    are `flex: 0 1 auto; min-inline-size: 0`, and a label that does not fit
    truncates with an ellipsis. The label stays whole in the DOM, so the
    accessible name is the full text.
  - `fill` makes the root `flex` at `inline-size: 100%` and gives each segment
    `flex: 1 1 0`, so the segments share the width equally. This is the phone
    menu's case.
  - **Four segments at 320px.** A 320px viewport with Psi's 16px gutters
    leaves 288px. `light | dark | acme | ember` measures 239px at size 32,
    which fits with 49px to spare, and 288px at size 40, which fits with
    nothing to spare. So on a phone use size 32, or `fill`. Four labels of two
    words (`Last 7 days | Last 30 days | This quarter | All time`, 390px at 32)
    do not fit, and truncate. Measured in Storybook's Chromium with the
    default font stack (the `Narrow` story holds all four cases).
  - The root is `inline-size: fit-content`, not `auto`. As a flex item of a
    column, which is what `Tabs` and a vertical `Stack` are, an `auto` width
    stretches the pill across the column. Found in the view-switch story.
  - So the guidance is: 2–4 segments of one or two words. Five or more options,
    or long labels, are a `Select` (a setting) or an underlined `TabList` (views),
    which wraps.

  ### Which one to pick (Tabs, RadioGroup, SegmentedControl)

  | The job | Use |
  | --- | --- |
  | Switch 2–4 views of one region, compactly (Map / Trace, Preview / Code) | `Tabs` + `SegmentedControl` + `TabPanel` |
  | Switch page sections, or more than 4 views, or a vertical list | `Tabs` + `TabList` + `Tab` |
  | Pick one of 2–4 short options that applies at once (Light / Dark / System) | `SegmentedControl` on its own |
  | Pick a value a form submits, options with descriptions, or more than 4 | `RadioGroup` (or `Select` for many) |
  | Run an action | `Button`, `Toolbar` |

  This table goes into `guidance.ts` as a rule, `llms.txt`, the a11y notes and
  the docs page.

  ### Machine trail and docs

  - `SegmentedControl` and `Segment` are exported from `@handamade/psi-react`,
    listed in `emit-manifest.ts`, and get a11y metadata (`a11y-meta.ts`) and axe
    cases in both modes, with a disabled segment.
  - Slot contracts: `SegmentedControl/slots.json` has a `body` slot that accepts
    `Segment`, `1..*`. `Tabs/slots.json`'s `body` slot adds `SegmentedControl`.
  - `guidance.ts` gets the rule above; `packages/react/llms.txt` gets a
    `SegmentedControl` section; the component count goes from 57 to 59 wherever
    prose states it (`check-docs-drift`).
  - The generated per-component docs (`packages/react/docs/*.md`), which the MCP
    serves, cover both components.
  - Docs site: a `segmented-control` page in `packages/docs/src/pages.ts`
    (members `SegmentedControl`, `Segment`) with two examples, a setting and a
    view switch.
  - Storybook: `SegmentedControl.stories.tsx` with stories for the setting, the
    view switch inside `Tabs`, sizes, a disabled segment, `fill`, and a 320px
    frame with four segments. VR baselines come from CI's render (D89, D112).
  - A changeset (minor for `psi-tokens` and `psi-react`).

## Out of scope

- Icons in segments, and icon-only segments. Text labels are what the homepage
  needs; an icon segment needs an accessible-name rule of its own.
- A sliding thumb animation between segments.
- Vertical orientation.
- Right-to-left arrow keys, for `Tabs` and `SegmentedControl` together.
- A control-wide `disabled`.

## Follow-ups

- Right-to-left arrow keys in `useTabsKeyboard`, which would fix `Tabs` and
  `SegmentedControl` at once.
- Icon segments, if a consumer asks.
