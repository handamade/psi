---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": patch
---

A segmented control: `SegmentedControl` and `Segment` (D132).

- **One pill, two jobs.** A row of 2–4 text segments with one selected, shown by the accent tint, the accent label and a 1px inset ring, so never by colour alone. With `value` and `onValueChange` it is a radio group for a setting that applies at once, wherever it sits: `<SegmentedControl aria-label="Color scheme" value={v} onValueChange={setV}>`. Without them, inside `<Tabs>` it is the tab list, in place of `TabList`, and its segments switch the `TabPanel` of the same value; `Tabs` owns the value. Controlled only.
- **Keyboard.** One tab stop; the arrows move and select, wrapping (both axes as a radio group, Left/Right as a tab list); Home and End. A `disabled` segment uses `aria-disabled` and is skipped.
- **Sizes** `24 | 32 | 40` (default 32), the height of a Button of the same size. The control never wraps: it is as wide as its labels and truncates them in a narrower container; `fill` stretches it and shares the width equally. Four one-word segments fit a 320px phone at size 32.
- **Tokens** `--psi-segmented-*`, on the semantic layer and the control ramp. The shape is a pill (`--psi-radius-full`) whatever the theme's control radius. No new contrast pair.
- **Tabs** shares its tab-stop rule (D93) and keyboard with it, and `Tabs`' body slot accepts `SegmentedControl`. Two changes to `Tabs`:
  - **A `TabPanel` hides its `Tabs` from its content**: children render under an empty `TabsContext`. A `Tab` or `TabList` stranded in a panel now throws instead of joining the outer tab set, and code of your own that reads the exported `TabsContext` inside a panel now gets `null`.
  - **Fix:** since 0.34.0 the arrow keys reach a disabled tab (D131), and a click on another tab after that left two tab stops. Each tab now re-takes its own when the stop moves.
- **MCP `search`**: a query's results now fill to the response budget, best first, as the overview's already do. `Segment` made `button` match one component more and pushed that answer past 6,000 characters.
