---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A segmented control: `SegmentedControl` and `Segment` (D132).

- **One pill, two jobs.** A row of 2–4 text segments with one selected, shown by the accent tint, the accent label and a 1px inset ring, so never by colour alone. On its own it is a radio group for a setting that applies at once: `<SegmentedControl aria-label="Color scheme" value={v} onValueChange={setV}>`. Inside `<Tabs>` it is the tab list, in place of `TabList`, and its segments switch the `TabPanel` of the same value; `Tabs` owns the value. Controlled only.
- **Keyboard.** One tab stop; the arrows move and select, wrapping (both axes as a radio group, Left/Right as a tab list); Home and End. A `disabled` segment uses `aria-disabled` and is skipped.
- **Sizes** `24 | 32 | 40` (default 32), the height of a Button of the same size. The control never wraps: it is as wide as its labels and truncates them in a narrower container; `fill` stretches it and shares the width equally. Four one-word segments fit a 320px phone at size 32.
- **Tokens** `--psi-segmented-*`, on the semantic layer and the control ramp. The shape is a pill (`--psi-radius-full`) whatever the theme's control radius. No new contrast pair.
- **Tabs** shares its tab-stop rule (D93) and keyboard with it; Tabs itself behaves as before. `Tabs`' body slot accepts `SegmentedControl`.
