# @handamade/psi-tokens

## 0.37.0

### Minor Changes

- 7625788: `AppShell` can animate its sidebar (D142). `sidebarMotion="slide"` runs the sidebar's column to 0 and back, fading the sidebar, while its content holds still at the open width; main's rounded corner (D110) follows, and the edge line (D114) rides the moving edge. The default, `"instant"`, keeps today's markup and look.

  Timing comes from two new tokens, never a prop: `--psi-app-shell-sidebar-duration` and `--psi-app-shell-sidebar-ease`. They alias the `move` motion preset (200ms, `--psi-ease-soft`, D141), so `prefers-reduced-motion` makes the sidebar instant, and the theme gate holds a theme's duration to a step or a preset.

  Closed under `"slide"`, the sidebar is `visibility: hidden` instead of `hidden`. It leaves the tab order and the accessibility tree when the close ends. Its content sits in one inner `<div>` that scrolls, so code that scrolls the sidebar must scroll that wrapper. Right-to-left mirrors with no extra setup. With no `sidebar` content, `"slide"` is the instant frame.

  In both modes, a sidebar that closes while it holds focus now hands focus to the toggle whose `aria-controls` names it, or to `main` when there is none. Before, focus fell to `<body>`.

- 4a23c86: Motion presets (D141): a duration and an easing chosen together, named by what the motion is for. Each preset is two tokens that alias the scale, so reduced motion reaches them and a component's own motion tokens can point at either half:

  - `feedback`, `--psi-motion-feedback-duration` / `-ease`: 150ms, `ease`. A control answering a pointer or a key.
  - `move`, `--psi-motion-move-duration` / `-ease`: 200ms, `--psi-ease-soft`. Something entering, leaving or changing size.
  - `emphasis`, `--psi-motion-emphasis-duration` / `-ease`: 350ms, `ease`. A deliberate change that draws the eye.

  Every transition and animation in Psi's component CSS now binds one, with the same timing as before. The one change you could notice: `NavBar` links change colour on the `feedback` curve (`ease`) instead of `--psi-ease-soft`, like every other control. `Skeleton`'s pulse and `.psi-media-tint` stay on the raw scale.

  The presets appear in `resolved/<theme>.json` (`scales.motion.presets`), the DTCG file (`motion.<name>.duration` and `.ease`, as aliases), and `guidance.json` (`motion.presets`, with each preset's intent).

  The theme gate now refuses a `componentOverrides` value for a `*-duration` key that is not exactly `var(--psi-duration-<step>)` or `var(--psi-motion-<preset>-duration)`. A literal such as `200ms` never reads a duration token, so reduced motion could not zero it. The stylelint plugin gains `psi/motion-presets`, which reports a raw `--psi-duration-*` or `--psi-ease-*` in a component stylesheet's transition or animation.

- 3a90a75: `NavTree` can draw a guide line and colour its icons apart from their text, through tokens alone (D138).

  - **A guide line down an open group's entries.** `--psi-nav-tree-guide-width` (default `0px`, so nothing is drawn) and `--psi-nav-tree-guide-border` (default `--psi-border-strong`) draw a line centred under the group's icon. Psi places it from the group's own geometry (19px from the group's start at the default 16px icon and a 1px line), so you set no column. Only a group with an icon draws it, and it mirrors in RTL. Write the width with a unit.
  - **The current entry's bar becomes a segment of that line.** The bar is now `--psi-nav-tree-indicator-width` (`3px`), `--psi-nav-tree-indicator-inset-block` (`0`) and `--psi-nav-tree-indicator-radius` (the tree's radius). While a group draws its guide line, the current entry's bar in that group moves onto it.
  - **Icon colours of their own.** `--psi-nav-tree-item-icon-fg` and `--psi-nav-tree-group-icon-fg` colour an entry's and a group's icon (default `currentColor`, the text's). The current entry's icon follows its text.
  - **What changes for you:** nothing until you set them. Every default draws today's pixels. A sidebar that reached into the tree's markup with CSS for this look can drop that CSS and set these tokens in its theme's `componentOverrides` instead.

- f96adda: A nested theme keeps the page's geometry (D139), and a `NavBar` brand lines up with the `AppShell` sidebar (D140).

  - **Behaviour change for every app that nests a theme.** Inside an element with its own `data-psi-theme` (a dark sidebar, a dark header, a themed panel), geometry, type and motion tokens now keep the value of the page around them instead of going back to Psi's default. That covers widths, padding, radii, gutters, heights, fonts and similar tokens: `--psi-app-shell-sidebar-width`, `--psi-control-radius`, `--psi-navbar-gutter`, `--psi-card-radius`, `--psi-button-radius`. The value can come from the page theme's `componentOverrides`, from `:root` or from any ancestor. Until now every component token was declared again on each `data-psi-theme` element, so a page theme's `card-radius: 0` (ember's, for one) turned back into 0.5rem inside a dark region, and a header under a dark theme read a 16rem sidebar whatever the page set. **Colour tokens do not change:** they are still declared on every theme and resolve against the nested theme's palette, and a page theme's colour overrides stay in the page theme.
  - **A dial set by hand on a nested theme's element no longer reaches its aliases.** `<div data-psi-theme="dark" style="--psi-control-radius: 3px">` changes `--psi-control-radius` there, but `--psi-button-radius`, `--psi-input-radius` and the other tokens that read it keep the page's value. Put the dial in that theme's `componentOverrides` instead, where it reaches them: a theme that overrides a token now declares the geometry tokens that read it again in its own block. Or set the aliases beside the dial.
  - **`components.css` declares each component's tokens in two rules:** `:where(:root)` for geometry, type and motion, and `:where(:root, [data-psi-theme])` for colour. Both have zero specificity, so a theme's `componentOverrides` still win regardless of import order.
  - **The theme gate refuses a geometry override that binds a colour** (`ThemeGateError`, scope violation group `"page"`). Such a value would carry the page's resolved colour into every nested theme, unchecked against its contrast. No shipped theme does this.
  - **`NavBar brandAlign="sidebar"`** sizes the brand slot to the `AppShell` sidebar, so a leading `<IconButton aria-label="Menu"><IconMenu size={16} /></IconButton>` puts its icon on the column where the sidebar's `NavTree` icons start, and the links or actions start where the page starts. The row is laid out fluid. It mirrors in right-to-left, keeps its place when the sidebar closes, and works under a header with its own `data-psi-theme`. New tokens: `--psi-navbar-brand-width` (the sidebar's width), `--psi-navbar-brand-inset` (12px) and `--psi-app-shell-sidebar-padding` (8px, the sidebar's inset, which was fixed until now).

## 0.36.0

### Minor Changes

- 4c99abe: A `Field` wires every control the same way (D135).

  - **Inside a `Field`, the Field's `id` wins over the control's own.** This changes which `id` wins: until now a caller's `id` on an `Input`, `Select` or `Textarea` beat the Field's and silently disconnected the label, so the control had no name. Now the control always takes the id the `<label for>` points at, and the caller's is not used. To give a control a known id, set it on the Field: `<Field htmlFor="email">`. In development the control warns once when a caller's `id` differs.
  - **While the Field has an error, the control is `aria-invalid`; while it is required, the control is `required`,** whatever the caller passes. A caller's `aria-invalid={false}` no longer hides an error that is on screen. While the Field sets neither, a caller's own `aria-invalid` or `required` still stands. `aria-describedby` is joined, as before.
  - **This includes a `Checkbox` in a group `Field`:** a caller's `aria-invalid={false}` on one box in an invalid group no longer clears it (it did since D108).
  - **`Checkbox` and `Switch` take a `Field`'s wiring outside group mode,** as `Input` and `Select` do: its id, its message in `aria-describedby`, `aria-invalid` and `required`. They are named by the Field's label and their own, e.g. "Notifications Email me weekly", and described by the Field's error or description. A Field without a label leaves the box's own name. In a group Field they take `aria-invalid` only, `Switch` now as `Checkbox` does. Spreading `useFieldControl()` onto a box is no longer needed. That spread replaced the box's own name with the Field's label.
  - **`--psi-toolbar-control-width` reaches the control of a top-labelled `Field`** that is a direct `Toolbar` child (an `Input`, a `Select` or a `Combobox`), as it reaches a bare control. A labelled filter row is now as even as an unlabelled one: the `filter-form` and `date-range-filter` presets' controls go from their content width (about 172, 80 and 141px) to 200px. A Field's `controlWidth` replaces the token. A side-labelled Field (`labelPosition="start"`, such as "Rows per page") keeps its content width. `Field` marks its root with `data-psi-field`.

### Patch Changes

- d2828e6: Focus no longer drops to the page when a `Dialog` or a focused toast goes away (D136).

  - **`Dialog` removed while open.** `{open && <Dialog open />}` removes the dialog on every dismissal, and the platform returns focus to the opener only on `close()`. Unmounting an open `Dialog` now closes it first, so focus returns to the opener as it does for `open={false}`. Nothing is reported through `onClose`.
  - **A toast that held focus.** When a focused toast leaves, however it leaves (its dismiss button, a timer, eviction past `limit`, `clear()`, `dismiss(id)`, or a stack composed by hand), `ToastRegion` hands focus to the toast now at its position (its dismiss button, else its first control; the new last if it was last). Once the stack is empty, focus goes back to the element focused before focus entered the region, and to the region itself if that element is gone. A mouse click on a dismiss button goes back first, so focus left in the stack never holds the timers paused. Focus the user moved elsewhere is left alone.
  - `ToastRegion` now has `tabindex="-1"` (focusable by script, never in the Tab order) and shows the focus ring on `:focus-visible`, from a new `--psi-toast-focus-ring` token bound to `--psi-border-focus`. `Toast`'s dismiss button carries `data-psi-toast-dismiss`.

## 0.35.0

### Minor Changes

- e0e9f94: A segmented control: `SegmentedControl` and `Segment` (D132).

  - **One pill, two jobs.** A row of 2–4 text segments with one selected, shown by the accent tint, the accent label and a 1px inset ring, so never by colour alone. With `value` and `onValueChange` it is a radio group for a setting that applies at once, wherever it sits: `<SegmentedControl aria-label="Color scheme" value={v} onValueChange={setV}>`. Without them, inside `<Tabs>` it is the tab list, in place of `TabList`, and its segments switch the `TabPanel` of the same value; `Tabs` owns the value. Controlled only.
  - **Keyboard.** One tab stop; the arrows move and select, wrapping (both axes as a radio group, Left/Right as a tab list); Home and End. A `disabled` segment uses `aria-disabled` and is skipped.
  - **Sizes** `24 | 32 | 40` (default 32), the height of a Button of the same size. The control never wraps: it is as wide as its labels and truncates them in a narrower container; `fill` stretches it and shares the width equally. Four one-word segments fit a 320px phone at size 32.
  - **Tokens** `--psi-segmented-*`, on the semantic layer and the control ramp. The shape is a pill (`--psi-radius-full`) whatever the theme's control radius. No new contrast pair.
  - **Tabs** shares its tab-stop rule (D93) and keyboard with it, and `Tabs`' body slot accepts `SegmentedControl`. Two changes to `Tabs`:
    - **A `TabPanel` hides its `Tabs` from its content**: children render under an empty `TabsContext`. A `Tab` or `TabList` stranded in a panel now throws instead of joining the outer tab set, and code of your own that reads the exported `TabsContext` inside a panel now gets `null`.
    - **Fix:** since 0.34.0 the arrow keys reach a disabled tab (D131), and a click on another tab after that left two tab stops. Each tab now re-takes its own when the stop moves.
  - **MCP `search`**: a query's results now fill to the response budget, best first, as the overview's already do. `Segment` made `button` match one component more and pushed that answer past 6,000 characters.

## 0.34.0

### Minor Changes

- 6e1bbe5: A Combobox for searching a list and picking one value or several (D130).

  - **New: `Combobox`.** Type to filter a list and pick from it. Options are data, `{ value, label, description?, disabled? }`. The default filter is a "contains" match on the label that ignores case and accents, so "zur" finds "Zürich". Pass `filter={fn}` to replace it, or `filter={false}` to filter the list yourself, with `loading` and a `moreMessage` line for a server-side search.
  - **Single or several.** By default it picks one value (`string | null`). With `multiple` it picks several (`string[]`), shown as `Tag`s inside the control, which wraps and grows. Backspace in the empty input removes the last value.
  - **Fits the rest of Psi.** Inside a `Field` it takes the label, description, error and required wiring, and `controlWidth` sizes it. A bare Combobox in a `Toolbar` takes the toolbar's control width. `name` writes hidden inputs, so a form submits the values, not the text. `clearable` adds a clear button. Sizes are 24 to 48, and a multi-select starts at 32.
  - **Keyboard and screen readers.** It follows the ARIA combobox pattern. Focus stays in the input. Enter picks and never submits the form while the list is open. Esc closes the list without closing a surrounding `Dialog`. Disabled options are reachable but can't be picked. A polite live region says the number of results. Every name it adds can be translated: `clearLabel`, `toggleLabel`, `removeLabel`, `emptyMessage`, `loadingMessage` and `resultsLabel`.
  - **The popup** is on the top layer, so it draws above a `Dialog`. It is at least as wide as the control, and it scrolls past `--psi-combobox-popup-max-height`, an alias of the shared `--psi-popup-max-height` (320px).
  - **New tokens: `--psi-combobox-*`.** Each one aliases a value `Select` or `Menu` already uses, so a theme that styles those styles the Combobox too.
  - **Breaking, before 1.0: `Select` no longer accepts `multiple`.** A native multi-select showed about 1.5 rows of its list in a fixed-height box, and nothing could make it taller. **What changes for you:** remove `multiple` from any `Select` and use `<Combobox multiple>` instead. TypeScript now reports the prop as an error.
  - **`Tag` takes `dismissLabel`**, the dismiss button's name, so several dismissible tags can each say what they remove ("Remove Berlin"). The default is still "Dismiss".

- 6c05ff4: The MCP answers with the docs (D129). `get` now returns each docs page's own markdown, the same text as psi.kurkin.de/docs/…/<page>.md, examples included, **instead of JSON**: anything that parsed `get`'s JSON must read markdown instead. Two new tools: `theme` derives a light and dark theme, solved to WCAG AA, from one colour or a hue, and `check` reports JSX that uses Psi's API wrongly (unknown exports, props and values, missing required props, slot contracts, missing accessible names). None of the four tools writes files or calls a model. `manifest.json` gains `attributes`, `accessibleName` and `contracts`, with the pass-through attribute names in `dist/attributes.json`; `@handamade/psi-tokens/generate` exports `parseColor`, `contrastReport` and `ACCENT_CHROMA`. In `@handamade/psi-mcp`, the `Detail` type export is removed, and `buildIndex` now returns `BaseIndex`, the index without its baked `docs`. `createPsiServer(store, version)` now takes a third argument, the `index`; `Store` gains `suggest`, and `get` returns a `Page` (`{ id, kind, title, markdown }`).
- 712e86a: A Menu that scrolls, keeps focus and reaches disabled items, and a shared cap for a popup's height (D131).

  - **A long `Menu` scrolls.** Past `--psi-menu-max-height` it stops and scrolls, and the focused item stays in view as the keys move. 43 items used to run 1,567px down a 768px window; now the menu is 330px tall. A menu taller than the room on both sides of its trigger opens on the side with more room and fills it. **What changes for you:** a menu longer than about eight items now scrolls.
  - **New tokens: `--psi-popup-max-height` (320px)**, shared by every popup, and **`--psi-menu-max-height`**, Menu's alias of it. Set the shared one in a theme to retune every popup, or the alias for menus alone.
  - **Removing the focused item keeps focus in the menu.** A re-render that removes it moves focus to the item now at its position, or the new last item. An emptied menu holds focus itself, so Esc and Tab still report `"esc"` and `"tab"`. Before, focus fell to the page and the arrow keys stopped working.
  - **Disabled menu items and tabs are reachable by the keyboard.** The arrow keys, Home, End and typeahead now land on a `MenuItem disabled`, and a menu whose first item is disabled opens on it; activating it still does nothing. In `Tabs`, the arrows and Home/End focus a disabled tab without selecting it, so the panel stays put. **What changes for you:** a test that expected the arrows to skip a disabled item now lands on it.
  - Menu's popup and placement code moved into internal layers the coming `Combobox` shares, with no visible change.

## 0.33.0

## 0.32.0

### Minor Changes

- 89527cb: A Field sizes its control, and a stacked form stops at 640px (D125).

  - **`Field controlWidth={80 | 120 | 160 | 240 | 320 | 480}`.** The control the Field wraps — an Input, a Select, a Textarea, or a control built on `useFieldControl` — takes that width in px and shrinks in a narrower column. The label and the message line keep the Field's width. At size 32 an Input fits about 7, 12, 17, 26, 36 and 55 digits: an ICCID's 20 digits fit 240, a page-size Select fits 80. Without the prop a control fills its Field, as before.
  - **`FieldStack` is capped by a new token, `--psi-field-stack-max-width` (640px).** A stacked form in a page's main column was as wide as the column. **What changes for you:** a FieldStack wider than 640px is now 640px, at the start of its container. Set `--psi-field-stack-max-width` on a scope, `none` included, to change it for one form, or in a theme's `componentOverrides`.
  - **A pattern can fill a Field's `error`.** `error` is now a slot of `Field`.

- 32717a7: An icon and a count in the navigation tree, and a new `Count` component (D124).

  - **`Count`**: a number after a label, such as _Cards 238_. Tabular numerals, quiet by default, capped at `max` (_999+_). `tone="attention"` is a pill in the warning tint and medium weight, so colour is never the only signal. `label` gives a screen reader words in place of the number (_4 stuck_). It is never a live region.
  - **`NavItem` `icon` and `count`**, and **`NavGroup` `icon`**: a decorative icon before the text, sized by `--psi-nav-tree-icon-size` and coloured with the text in every state, and a count at the end of the row. Both go inside the link: with a router link, `NavItem` clones it to hold them. Without them, nothing changes.
  - **Tokens**: `--psi-count-*`, `--psi-nav-tree-icon-size`, `--psi-nav-tree-icon-gap`.
  - **Manifest**: `NavItem` and `NavGroup` list their slots (`icon`, `count`, `label`, `body`).

## 0.31.0

### Minor Changes

- 1f76199: Input, Select and Textarea draw their border at 3:1 or better in every theme (D120).

  - **A field's border is now its control edge.** `--psi-input-border`, `--psi-select-border` and `--psi-textarea-border` bind `--psi-border-control`, the border an unchecked checkbox or radio already uses. They were on `--psi-border-neutral`, which measured 1.32–1.48:1 against the surfaces a field sits on. WCAG 1.4.11 asks 3:1 for the edge that identifies a control, and a field's fill is the canvas itself. **What changes for you:** every field in every theme draws a visibly darker edge. If you set one of these variables yourself, your value still wins.
  - **A new token for hover, `--psi-border-control-hover`.** `fgPrimary` at 0.75 alpha in light-based themes and 0.60 in dark-based. The three fields' `-border-hover` bind it. It's a step darker than rest. The old hover, `--psi-border-strong`, would have been lighter than the new rest border.
  - **The contrast gate checks it.** `nonTextPairs` gains `borderControlHover` on `bgPrimary` and `bgSecondary` at 3:1, so the build, `buildThemeCss` and `psi-theme` refuse a theme that breaks it. A theme that changes only its palette clears it whenever it clears `--psi-border-control`. If you override `--psi-border-control`, override `--psi-border-control-hover` with it, so hover stays the darker of the two.
  - `--psi-border-neutral` and `--psi-border-strong` are unchanged. They keep their decorative uses, InlineAlert's neutral border and the outline Button.

- d190c51: An unchecked Switch's track reaches 3:1 or better against its surface in every theme (D122).

  - **The track is now a control fill.** `--psi-switch-track-bg` binds the new `--psi-fill-control`, the surface twin of `--psi-border-control` (a ref to it, so the two are one ink). It was on `--psi-fill-neutral4`, which measured 1.10–1.27:1. WCAG 1.4.11 asks 3:1 for what identifies a control. **What changes for you:** every unchecked Switch draws a mid-grey track (3.24:1 or better), and the white thumb shows clearly on it (3.47:1 or better). Those floors are measured on Psi's shipped themes; a derived theme is held to 3:1 by the gate. If you set `--psi-switch-track-bg` yourself, your value still wins.
  - **A hover, `--psi-fill-control-hover`.** `fgPrimary` at 0.75 alpha in light-based themes and 0.55 in dark-based, bound by the new `--psi-switch-track-bg-hover` on an enabled, unchecked Switch. The checked track and the thumb don't change on hover.
  - **The contrast gate checks it.** `nonTextPairs` gains six pairs: both tracks on `bgPrimary` and `bgSecondary`, and the white thumb on each track. The build, `buildThemeCss` and `psi-theme` refuse a theme that breaks them. If you override `--psi-border-control` at theme scope, the Switch track moves with it (a nested-element override doesn't reach `--psi-fill-control`); override `--psi-fill-control-hover` alongside so hover stays a step beyond rest.
  - `--psi-fill-neutral4` is unchanged and keeps its other uses.

- d037ad3: A text link: `Link` and the `.psi-link` class (D119).

  - **`Link`**: the accent colour, underlined at rest, mixing toward ink and thickening its line on hover; `current` sets `aria-current="page"`, drawn as medium-weight text with no underline. With `href` it renders the anchor. A router app passes its own link as the only child instead, and `Link` adds the class and `aria-current` to it, as `NavItem` does. The font is inherited.
  - **`.psi-link`** in `utilities.css` holds the rules, so any `<a>` — rendered markdown, a page without React — can take the class.
  - **`--psi-link-*` tokens**: `fg`, `fg-hover`, `fg-current`, `font-weight-current`, `underline-thickness`, `underline-thickness-hover`, `underline-offset`, `focus-ring`, `radius`.
  - **A new contrast pair**: the accent as text on `bgSecondary` (the Panel, Card, Dialog and Menu surface) is gated at 4.5. Every shipped theme already passes; a theme built with `psi-theme` is solved to pass.

## 0.30.0

### Minor Changes

- e79533e: Every theme declares its `color-scheme` (D116).

  - **Dark themes now draw the browser's own parts dark.** A theme's CSS declares `color-scheme: light` or `color-scheme: dark` from its base, so a date field's picker icon, a native select's list, spin buttons and scrollbars match the theme. Before, they were drawn for a light page on every theme, which put a near-black calendar icon on a dark date field. **What can change for you:** on a dark theme those parts render dark, and the browser's system colours flip too (for example `LinkText` on unstyled links, `Field` and `ButtonFace` on unstyled native controls), not only pickers and scrollbars. On a light theme nothing changes, unless your page lets the OS choose (`<meta name="color-scheme" content="light dark">`, or your own `color-scheme: light dark` in a layer): the light theme's `:root` now pins `light`. To restore the choice, set `color-scheme` in an unlayered rule. An unlayered `color-scheme` rule of your own, one in a layer declared after `psi.theme`, or an inline style overrides it; one in `@layer psi.base` does not.
  - **Sub-trees follow.** A `data-psi-theme="dark"` element inside a light page, such as `AppShell`'s `sidebarTheme="dark"`, takes the dark scheme with its tokens.
  - **Your own themes too.** `buildThemeCss` and `psi-theme` declare the scheme from the definition's `base`, `light` when none is named; rebuild to pick it up.
  - **`resolved/<theme>.json` gains `colorScheme`**, `"light"` or `"dark"`.
  - The rule stands: a theme still paints no background.

- 1981411: Labels beside their controls: `Field labelPosition` and `FieldStack` (D115).

  - **`<Field labelPosition="start">`** puts the label before the control, with the message line under the control. The label still names the control, and the order is still label, control, message. The default, `"top"`, is unchanged.
  - **`<FieldStack labelPosition="start" gap={8|12|16|24}>`** (gap defaults to 24) is a form whose Fields share one label column, as wide as the longest label up to `--psi-field-label-max-width` (240px). Under 480px of its own width, its labels return above their controls. A Field's own `labelPosition` wins, and a `start` Field inside a `"top"` stack keeps two columns of its own.
  - **A group Field in the start position** renders `<div role="group">` named by its label, since a fieldset can't share a stack's columns.
  - **New tokens:** `--psi-field-label-align` (`start`; a theme sets `end` to put labels against their controls), `--psi-field-label-max-width` and `--psi-field-column-gap`.
  - **The `table-pagination` and `cursor-pagination` presets** put _Rows per page_ beside its select, so the pager is one line high.

- 20979dd: A page heading in the brand's display face: `PageHeading` (D118).

  - **`PageHeading`**: the page's one `h1`, at 24/32 medium in `--psi-font-display`, with margin 0. Use one per screen, as the first thing in the page. Inside an `AppShell`, it goes after any `banner`, and margin 0 keeps the page one block padding below the header and below a banner alike. It has no `as`, `size` or face prop. Restyle it through `--psi-page-heading-font` and `--psi-page-heading-fg`.
  - **A new text style, `--psi-text-display-24-32-medium`**, with its utility `.psi-text-display-24-32-medium`: 24/32 medium in the display face. Unlike the fluid `--psi-display-*` tier, it has fixed px, no tracking and no uppercase.
  - **The `app-shell` preset** now opens its page with a `PageHeading`.
  - `guidance.json`'s `typographyDefaults` gains `pageHeading`. `heading` is unchanged.
  - `Text` is unchanged. It still stops at `h4`.

- 1a01b14: A `Toast` dismiss button with a name you can set (D117).

  - **New `dismissLabel` prop** on `Toast`, on `show()` and on `ToastProvider`: the dismiss button's accessible name, for a translated app. It stays an icon button; only its name changes. A toast's own value wins, then the provider's, then the default `"Dismiss notification"`, so nothing changes for you unless you set it. The provider reads its value at render, so changing it renames toasts already on screen.
  - It is not `Dialog`'s `closeLabel`, which gives the close button visible text. `Dialog`'s "Close dialog" and `Banner`'s "Dismiss" are still fixed names.

## 0.29.0

### Minor Changes

- 2be8eea: A frame that pads its page, takes a banner and can draw a line at its sidebar (D113, D114).

  - **`AppShell` now pads its page by 24px.** Two new tokens set it: `--psi-app-shell-main-padding-inline` and `--psi-app-shell-main-padding-block`. **What can change for you:** if your page already pads itself inside `AppShell`, it now has both paddings, and a page meant to fill `main` edge to edge, such as a full-width table or a split view, is now inset. Set the two tokens to `0`, or drop your own padding.
  - **New `banner` prop.** Pass one page-level `Banner`, or several. It renders inside `<main>`, before the page, edge to edge, and the page starts one block padding below it. It scrolls with the page, and a value that renders nothing takes no space.
  - **A line at the sidebar's edge.** `--psi-app-shell-sidebar-border-width` is `0` by default; `1px` draws a line on the sidebar's inline-end edge in `--psi-app-shell-sidebar-border`, which defaults to `--psi-border-faint`. Use it when the sidebar shares the page's background.
  - The `WithBanner` and `SidebarLine` stories show both.

## 0.28.0

### Minor Changes

- 29bbc1b: A frame with a rounded surface, with no CSS of your own (D110).

  - **Three new `AppShell` tokens.** `--psi-app-shell-bg` paints the shell's root, `--psi-app-shell-main-bg` paints `<main>`, and `--psi-app-shell-main-radius` rounds `<main>`'s top-start corner. They paint nothing by default, so a shell that sets none looks as it did. `--psi-app-shell-bg` shows only behind the corner and must equal the canvas of the theme on the header and the sidebar. No `var()` reaches a sub-theme from the page's scope, so write the value, in a theme's `componentOverrides` or on the root.
  - **The corner is square unless a header and a sidebar both meet `<main>`.** With the sidebar closed it would be a notch against the viewport's edge. `<main>` takes a class of its own in that case; nothing else changes.
  - **New `--psi-navbar-border-width`**, default `1px`. `0` removes the line and its pixel, so a `--psi-navbar-height` of 56px gives a bar of 56px. A transparent `--psi-navbar-border` hid the line and kept the pixel.
  - The `Frame` story shows the design: one dark theme over the header and the sidebar, with `data-psi-theme` on the `NavBar`. The skip link's inset ring follows the corner.

- 7671af6: `NavBar` sets its own text colour, so plain text in a themed header can be read (D111).

  - **New `--psi-navbar-fg`**, default `var(--psi-fg-primary)`, and `.navbar` paints it. Text in the bar used to inherit the page's colour as a resolved value, so under `data-psi-theme` on the `NavBar` it kept the page's: dark text on a dark bar, 1.11:1 where the Web Portal measured it. It now re-resolves under the bar's theme, as `--psi-app-shell-sidebar-fg` does in the sidebar.
  - **What can change for you.** If your `body`, or an ancestor of the `NavBar`, sets a colour other than `--psi-fg-primary`, plain text and `currentColor` icons in the bar now take `--psi-fg-primary`. Set `--psi-navbar-fg` to keep your colour. Buttons and links in the bar are unchanged.
  - The `Frame` stories show plain text in the header.

## 0.27.0

### Minor Changes

- f9fd47e: A checkbox and radio you can find (D106).

  - **New semantic border `--psi-border-control`** — `fgPrimary` at alpha 0.55 in light-based themes and 0.40 in dark-based ones — for a control identified by its outline alone. The unchecked `Checkbox` box and `Radio` circle bind it. They bound `--psi-border-neutral`, which measured 1.32–1.48:1, and now clear WCAG 1.4.11's 3:1 in every theme (3.24:1 at worst).
  - **The contrast gate has its first non-text pairs**, `nonTextPairs`: `borderControl` on `bgPrimary` and `bgSecondary` at 3:1. `buildThemeCss` and `deriveTheme` apply them too, so a consumer theme whose `fgPrimary` barely clears 4.5:1 could now fail; the error names the pair. Every theme `deriveTheme` can produce passes (3.22:1 at worst).
  - Input, Select and Textarea borders are unchanged.

- 0076c40: A checkbox and radio that show they are in error (D108).

  - **An unchecked `Checkbox` or `Radio` marked `aria-invalid` outlines in the field error colour**, as Input, Select and Textarea do (`--psi-checkbox-box-border-error`, `--psi-radio-group-circle-border-error`, both `--psi-fg-danger`). A checked or mixed one keeps its accent.
  - **`Checkbox` joins an invalid group `Field`:** inside `<Field group error>` every checkbox is now `aria-invalid`, as every `Radio` already was. It doesn't become `required`, because on a checkbox that would mean this particular box must be ticked. An `aria-invalid` you pass yourself still wins.

- a343102: A column and a line of text for pattern trees: `Stack` and `Text` (D109).

  - **`Stack`**: a column with a gap from the space scale (`gap={4|8|12|16|24|32}`, default 16) and `align="stretch|start|center|end"`. It's a plain `<div>` with no role and no wrap: Toolbar's vertical counterpart.
  - **`Text`**: one line or paragraph at a Psi text style. `as` takes p, span, div or h2–h4; `size` takes 12, 14, 16 or 18; `weight` is regular or medium; `tone` is primary or secondary. Margin is 0, so a Stack's gap does the spacing. Tokens `--psi-text-fg` and `--psi-text-fg-secondary` alias the gated foregrounds.
  - **The `empty-state` and `feedback-form` presets** now lay out as columns. Before, empty-state ran its headline, explanation and button together on one line, and feedback-form stacked its fields and button flush.

## 0.26.0

### Minor Changes

- 5906b2a: Two more form controls: Textarea and RadioGroup (D104), and a `feedback-form` pattern that demands both.

  - **`Textarea`**: the Input recipe on a native `<textarea>`, wired by a `Field` like `Input`. `minLength` and `maxLength` are native. With `maxLength`, a counter under the control shows `{length} / {maxLength}`. It is not a live region; it joins `aria-describedby`, so it is read with the field on focus. `showCounter={false}` hides it. There is no `size`: the height is `rows`, 3 by default.
  - **`RadioGroup` and `Radio`**: native radios sharing one name, so the browser supplies Tab and the arrow keys. Controlled (`value`, `onValueChange`) or uncontrolled (`defaultValue`), with `disabled` and `orientation`. Inside `<Field group>` the fieldset and legend name the group and `RadioGroup` adds no role. Standalone, it is `role="radiogroup"` and needs `aria-label`. A required or invalid Field makes every radio `required` and `aria-invalid`.
  - **Tokens** `--psi-textarea-*` and `--psi-radio-group-*`, all aliases of existing gated semantics, so no new contrast pair. `FieldContextValue` gains an optional `group` flag.
  - **Pattern `feedback-form`**: a required category as radios, a bounded description with a counter, and a submit button. 50 components, 24 patterns.

## 0.25.0

## 0.24.0

### Minor Changes

- a84fc5f: A button sizes the icon inside it (D97). **This changes how an icon in a `Button` renders.**

  - **New tokens `--psi-button-{24,32,40,48}-icon-size`**, each half the button's height: 12, 16, 20 and 24px. They are derived from `--psi-button-{n}-height`, so a height retuned at the theme root moves the icon with it.
  - **A direct `svg` child of a `Button` takes its size's token**, whatever the icon's own `size` prop: CSS beats the `width` and `height` an icon writes. An icon passed at the default 20 to a size-32 button now renders at 16, the size Psi's own buttons already drew. Pass icons to a `Button` without a `size`.
  - A wrapped icon (`<span><Icon/></span>`) is not sized, just as it gets no optical inset. `IconButton` does not bind the ramp: its icon keeps its own size.
  - `CopyButton` and `CursorPagination` follow the ramp: their icon is 16 at size 32 as before, and 12, 20 or 24 at the other sizes.
  - `guidance.json` gains `geometry.label.iconSize` and `geometry.iconSize`.

- 00f0396: A cap on the width of a button's label (D98). Off by default; no rendering changes unless you set it.

  - **New token `--psi-button-label-max-width`**, default `none`. Set it on your own class, and a label wrapped in a direct `<span>` stops at that width and ends in an ellipsis: `<Button className="account"><IconUser aria-hidden="true" /><span>{name}</span></Button>` with `.account { --psi-button-label-max-width: 12rem; }`.
  - A bare text label is not capped. Wrap it in a `<span>`, as a trailing icon already requires.
  - The full text stays the button's accessible name. Psi adds no `title`; whether a truncated label needs a visible full form is your design.
  - A direct `<span>` in a `Button` now has `overflow: hidden` and `flex: none`. With the cap off, it renders as before.

- 5bb40f4: A menu holds a line of text that is not an action (D99), and a new `account-menu` pattern demands it.

  - **New component `MenuText`**: a line such as a build identifier, inside the `role="menu"` element with no role of its own. It is in the accessibility tree as a child of the menu, never focused, never a `menuitem`, and the arrows, Home, End and typeahead skip it. It is never `aria-hidden`.
  - **`Menu` declares `aria-describedby`.** Give a `MenuText` an `id` and pass that id to make the line the menu's description, which some screen readers speak when the menu opens. It is off by default.
  - **New token `--psi-menu-text-fg`** = `--psi-fg-secondary`, already gated at 4.5:1 on the menu surface.
  - **New pattern `account-menu`**: a ghost trigger with the user's name, account actions, _Sign out_, and a `MenuText` line last. 47 components, 23 patterns.
  - In a menu's focus mode, a screen reader reaches the line by browse mode or the VoiceOver cursor. Placement was measured with axe and Chromium's accessibility tree, not with a screen reader; check it with yours.

## 0.23.0

### Minor Changes

- 07d969e: Utilities win over components (D94). **This changes the cascade for every consumer — check your resets before upgrading.**

  - **Component CSS now ships inside `@layer psi.components`.** Every rule in `@handamade/psi-react/styles` sits in the layer Psi's token stylesheets already order below `psi.utilities`, so a utility on a component root beats the component's own value: `<Tabs className="psi-gap-24">` gets a 24px gap, where it got 16px before.
  - **Unlayered CSS in your app now beats every Psi component rule, whatever its specificity.** A reset such as `button { padding: 0 }`, `* { margin: 0 }` or `a { color: inherit }` used to lose to Psi's class selectors and now wins: an unlayered `button { padding: 0 }` strips a `Button`'s padding. Move resets and element rules into a layer below Psi's, either `@layer psi.base { … }` or your own layer declared first (`@layer reset, psi.base, psi.theme, psi.components, psi.utilities;`). Deliberate component overrides can stay unlayered, and no longer need to out-specify Psi.
  - **CSS in a layer of your own declared after Psi's now beats Psi's component rules**, where before it lost to them.
  - **`styles.css` opens with the layer order statement**, so the five stylesheets can be imported in any order.
  - **New `psi-fg-*` utilities**, one per foreground token (`psi-fg-primary`, `psi-fg-secondary`, `psi-fg-on-accent`, …), each `color: var(--psi-fg-<role>)`, in `@layer psi.utilities` and listed in `guidance.json` → `utilities`.

## 0.22.0

### Minor Changes

- 4da3b5f: A filter row whose fields can show an error (D92). The default and `align="end"` are unchanged.

  - **`Toolbar` gains `align="start"`.** Items share their top edge, so every control under a one-line `Field` label starts on one line, and a direct `button` or `a` child drops by `--psi-toolbar-action-offset` onto that line. A field's description or error line hangs below its control and moves nothing else. Every label in such a row must be one line: a label that wraps pushes its control below the others. `align="end"` still requires a `Field` to end on its control.
  - **New token `--psi-field-label-height`** (20px, the label's line box). `Field`'s label holds it as its `min-block-size`, which renders the same height as before.
  - **New token `--psi-toolbar-action-offset`**: `calc(var(--psi-field-label-height) + var(--psi-field-gap))`, 26px. It is derived from `Field`'s tokens, so it moves with them when they are retuned at the theme root.
  - **Pattern `filter-form` is start-aligned.** Its `intent` no longer forbids a description or error line in the row. The error line is the `Field`'s own, with its usual `aria-describedby` wiring, and every label must be one line.

## 0.21.0

### Minor Changes

- 55c2ca1: Announcements route by politeness, not only by tone (D83). Every default is
  unchanged.

  - **`Toast`** gains `politeness` (`"polite" | "assertive"`): when set, it
    decides which of `ToastRegion`'s live wrappers speaks the toast, so a success
    can interrupt; unset, the variant decides as before. It also gains
    `statusLabel`: a string replaces the visually hidden status word ("Success:",
    "Warning:", "Error:") with a translated one, and `null` drops it.
  - **New `Announcement`**: visually hidden text that `ToastRegion` routes by its
    `politeness`, for an event that must be spoken and has nothing to show. It is
    not a live region and announces nothing outside a `ToastRegion`.
  - **`ToastRegion`** spreads its remaining HTML attributes, `data-*` included,
    onto its root element, so it can carry `data-react-aria-top-layer`.
  - **`useToast().show()`** accepts `politeness` and `statusLabel`.
  - **New pattern `announcer`**: one `ToastRegion` holding visible toasts and
    `Announcement`s. 35 components, 14 patterns.

- 59ae993: An application shell (D88): a skip link, a full-width header, a collapsible dark sidebar holding a navigation tree, and a `main` that scrolls on its own. Every new prop defaults to today's behaviour.

  - **`NavBar` renders `<nav>` only when it has children.** A bar with a brand and actions and no links no longer carries an empty navigation landmark. `navLabel?: string` names the links' `<nav>` (rest props land on the `<header>`, so it could not be named before). `fluid?: boolean` drops `psi-container` for a full-width row that keeps the gutter (`--psi-navbar-gutter`). `actions` keeps the trailing edge without links.
  - **New `SkipLink`**: a plain `<a href="#main">`, visually hidden until it takes keyboard focus, then fixed at the inline-start top corner on a surface with the shared focus ring. No script: native fragment navigation focuses a focusable target. Tokens `--psi-skip-link-*`. Do not place a `ToastRegion` at `top-start` in an app with a skip link.
  - **New `NavTree`, `NavGroup`, `NavItem`**: a `<nav aria-label>` around a list; `NavGroup` is a controlled `<button aria-expanded aria-controls>` over a list that is `hidden` when closed; `NavItem` styles the router link passed to it, with the current page set by weight, a surface and an inline-start bar. `NavItem` also takes `href` and `current` to render its own anchor, for plain links and presets. Native keyboard only, no roving focus. Tokens `--psi-nav-tree-*`.
  - **New `AppShell`**: a grid filling the viewport with the header in its own row and the sidebar and `main` each scrolling on their own, so nothing scrolls under the header (WCAG 2.2 Focus Not Obscured, no `scroll-padding`). Props `skipLink`, `header`, `sidebar`, `sidebarOpen` (controlled, default `true`; closed is `hidden`, not narrowed), `sidebarTheme`, `sidebarId`, `mainId`. `main` is the skip link's target (`tabIndex={-1}`). A desktop frame: no responsive drawer. Tokens `--psi-app-shell-*`.
  - **New pattern `app-shell`**: a skip link, a fluid `NavBar` with a Menu toggle, a dark `NavTree` sidebar and a scrolling main.

- a1ab416: Four feedback components (D86). None of them writes a live region; every default is unchanged.

  - **New `Banner`**: a full-width, page-level message with `variant`, `title`, an `action` slot (a ghost Button), `onDismiss` and `statusLabel`. It shows the message and announces nothing; route the same event through the announcer.
  - **New `InlineAlert`**: a message inside content, bordered in the variant's foreground colour. Despite the name it is not `role="alert"`.
  - **New `Skeleton`**: a loading placeholder, always `aria-hidden`, that stops under `prefers-reduced-motion`. Put `aria-busy` on the region it stands in for.
  - **New `CopyButton`**: a Button with a visible label that copies `value` and reports `"copied"` or `"failed"` through `onCopy`. It never changes its label; the application speaks the result.
  - **Shared status vocabulary.** `Toast`'s icons and hidden status words moved into `Toast/status.ts`, now shared by `Toast`, `Banner` and `InlineAlert`. `Toast` renders as before.
  - **Tokens.** `fgSuccess` and `fgWarning` gain the `border` scope, so the variant's foreground colour can draw a border. Three new contrast pairs are gated by the token build: `fgPrimary` on `fillTintSuccess`, `fillTintWarning` and `fillTintDanger`, each at 4.5:1. New component tokens `--psi-banner-*`, `--psi-inline-alert-*`, `--psi-skeleton-*`.
  - **Patterns**: new `page-banner`, `form-feedback`, `loading-table` and `copyable-id`. 41 components, 20 patterns.

- 563c8b9: Required in text, and custom controls join a Field (D84). Every default is
  unchanged.

  - **`Field`** gains `requiredText`: with `required`, the label shows that word
    — "(Required)" — instead of the asterisk, in the label's colour. It is
    aria-hidden because the control's `required` is the signal assistive tech
    reads. New token `--psi-field-required-text-fg`.
  - **`useFieldControl()`** is exported: inside a `Field` it returns `id`,
    `aria-labelledby`, `aria-describedby`, `aria-invalid`, `aria-required` and
    `required` as the Field sets them, for a control built outside Psi to spread onto its
    focusable element; `{}` outside a Field. `FieldContext` and
    `FieldContextValue` are exported too.
  - **New pattern `required-field`.** 15 patterns.

- cd9d918: A labelled filter form (D87). Every new prop defaults to today's behaviour.

  - **`Toolbar` gains `align?: "center" | "end"`**: `end` lines items up on their bottom edge, so controls under visible `Field` labels and a button without one share a control line. A `Field` in such a row ends on its control — no description or error line under it.
  - **`Toolbar` gains `as?: "div" | "form"`**: `form` renders a real `<form>`, so a submit `Button` and Enter in a field submit it. Labelled, it is a named form landmark and takes no `role="group"`. The ref type widens to `HTMLDivElement | HTMLFormElement`.
  - **`Input` is the size it names.** It is now `box-sizing: border-box`; under the browser's `content-box` every size rendered 4px over (32 → 36) and overflowed a `Field`. Consumers with a global border-box reset see no change; others see text inputs 4px shorter, at their stated size.
  - **`Button` declares `type`**, so the manifest lists it. No runtime change.
  - **New pattern `filter-form`**; `filter-toolbar` and `filter-form` point at each other; `cursor-pagination` is end-aligned, which puts its page-size select and pager on one line (they were 13px apart).

- 0a0da9d: One focus ring (D82): the ring's geometry is now three scale tokens, and
  every focusable part Psi renders binds them on `:focus-visible`.

  - **psi-tokens**: `--psi-focus-ring-width` (2px), `--psi-focus-ring-offset`
    (2px, a ring outside the control) and `--psi-focus-ring-offset-inset`
    (-2px, a ring inside it). Also in `resolved/<theme>.json`
    (`scales.focusRing`) and the DTCG export (`dimension.focusRing`). Menu and
    Dialog gain `--psi-menu-focus-ring` and `--psi-dialog-focus-ring`.
  - **psi-react**: every component's focus rule binds the tokens instead of a
    literal `2px`. Menu items, the `<dialog>` and a drawer's scrolling panel
    draw the Psi ring where the browser's own showed before. `Input` and
    `Select` key the ring on `:focus-visible`.
  - **One visible change**: the ring on `Input` and `Select` sits one pixel
    further in (offset `-1px` → `-2px`), wholly inside the control's box.

- 7d18400: Tables for a token-paged list (D85). Every default is unchanged.

  - **The Table family passes attributes through.** `Table`, `TableHead`,
    `TableBody`, `TableRow`, `TableHeaderCell` and `TableCell` spread their
    remaining HTML attributes onto their element (`aria-label`, `aria-busy`,
    `id`, `data-*`) and take a `ref`; their own attributes win.
  - **New `TableCaption`**: `<caption>` with a name line and a `detail` line for
    the range. It takes `tabIndex` and a `ref`, so focus can move to it after a
    page change; when focused it draws the shared ring.
  - **`TableCell`** gains `colSpan`, and `rowHeader`, which renders
    `<th scope="row">`.
  - **New `CursorPagination`**: a `<nav>` of two ghost Buttons with visible
    words, _Previous_ and _Next_, for a list that pages by opaque token. It holds
    no state.
  - **`Button`** insets a trailing icon (`> svg:last-child`) the way it insets a
    leading one.
  - **Patterns**: new `cursor-pagination`; `data-table` gains a caption with a
    range. 37 components, 16 patterns.

## 0.20.0

### Minor Changes

- dbb0c7a: Portal readiness (D81): Psi can now be the component basis of an application
  with a strict content security policy and a single live-region announcer, and
  can theme a brand it does not ship.

  - **`Field` gains `announce`** (default `true`). With `announce={false}` the
    message line is no longer a live region, for an application that routes every
    announcement through one announcer of its own. `aria-describedby` still links
    the message to the control.
  - **`Select`'s chevron is drawn with CSS gradients instead of a `data:` SVG**,
    so it renders under `default-src 'self'`. It now follows the theme through
    `--psi-select-chevron-fg` rather than a hard-coded `#666`. A new stylelint rule
    forbids `url()` in component CSS.
  - **Four icons:** `IconMenu`, `IconChevronLeft`, `IconLogOut` and `IconSimCard`,
    making 30.
  - **`@handamade/psi-tokens/theme`:** `buildThemeCss(name, definition)` builds a
    theme from a definition kept in the consumer's own repository, through the
    same WCAG AA contrast and D46 scope gates as Psi's shipped themes. The two
    builds run the same code, and a failing theme throws `ThemeGateError`. The
    `psi-theme` bin does the same from a build script. The token builders and
    definition types are re-exported for writing overrides.
  - The D46 `text` scope group now admits `background-image`, so a glyph drawn
    with gradients can bind an `-fg` token.

## 0.19.0

### Minor Changes

- 2d08895: Add `@handamade/psi-tokens/generate` (D57): derive a brand from a text prompt
  as an AA-solved light/dark pair, and serialize it as `customers/<name>.ts`
  source. `parsePrompt` is deterministic — an FNV-1a hash seeds a PRNG, so an
  unrecognised prompt still derives a coherent brand. `deriveTheme` returns both
  members from one `BrandVector`, each solved to WCAG AA by binary-searching
  lightness; it never returns a theme that renders below AA, because it throws
  instead of returning one when the solver can't clear the matrix. The package
  now compiles `src/generate` to `dist/generate` via `tsc`.

  "Clears the AA matrix" means the same **33** pairs `scripts/build.ts` gates
  every committed theme on — `wcagAAPairs` plus `componentLabelPairs` — not the
  28-pair subset. `buildBrandPalette` darkens the accent anchor only as far as a
  white `fgOnAccent` label needs to clear `fillAccent` with margin, so that pair
  passes by construction rather than by escalation; at a flat `l: 0.55` the worst
  hue (146, `vivid`) rendered it at 4.4979:1. The serialized `customers/<name>.ts`
  also carries the vector's `fonts`, and its solved overrides no longer narrow
  `fgDanger`'s scopes — either omission made the emitted file wrong, and the
  second made it unbuildable.

## 0.18.0

### Minor Changes

- b680d52: Toolbar's direct form controls stop stacking, and every composition
  pattern now has a real, mounted Storybook story.

  `filter-toolbar` composes a bare `Input`/`Select` directly under `Toolbar`
  — the pattern most likely to be copy-pasted verbatim, and the one that
  rendered wrong: `Toolbar`'s flex-wrap row had no constraint on its
  children, and `Input`/`Select`'s own `width: 100%` became their flex-basis
  as direct flex children, so each control claimed the full row and the
  toolbar stacked vertically instead of reading as one. `Field`-wrapped
  usage (as `apps/ledger`'s filter row already does) was never affected.

  `Toolbar` gains `--psi-toolbar-control-width` (200px default) and a
  scoped rule giving its own direct, unwrapped `input`/`select` children a
  deliberate width, matching the effect existing hand-written `Toolbar`
  stories already worked around one-off with inline styles.

  Separately: every pattern in `patterns.json` (13 today) now renders as a
  real, registered React element tree in its own generated Storybook story
  with a VR baseline — `renderPresetElement`, a sibling to the existing
  `renderPreset` JSX-string emitter, so a pattern's documented composition
  and its rendered layout can no longer silently drift apart, and a future
  pattern gets a story automatically rather than needing one hand-written.

## 0.17.0

### Minor Changes

- 964c40f: `.psi-sr-only`, a public visually-hidden utility.

  Psi had no public way to hide content visually while keeping it in the
  accessibility tree — the technique existed only as private, byte-identical
  CSS duplicated across Toast, Checkbox and Switch, and nothing in `llms.txt`
  documented the convention. `.psi-sr-only` ships from `utilities.css`,
  generated the same way every other hand-written utility family is (D79), so
  it appears in `guidance.json` → `utilities.classes` automatically.

  Toast, Checkbox and Switch now consume it instead of their own private
  copies — internal cleanup only, no prop, behavior, or ARIA change (D80).
  The shared recipe also adds `clip-path: inset(50%)` alongside the legacy
  `clip: rect(0 0 0 0)`, a correctness fix none of the three private blocks
  had. One behavioral consequence: this hiding now lives in
  `utilities.css` rather than shipping inside `@handamade/psi-react/styles`,
  so consumers who had been omitting `utilities.css` will see a raw
  unstyled checkbox/switch input and a visible "Success:"/"Warning:"/"Error:"
  prefix in toasts, instead of merely mis-themed content. `utilities.css`
  is already documented as required (`NavBar` has depended on it the same
  way), so the risk is low.

## 0.16.0

### Minor Changes

- 1025e4a: Pagination clamps an out-of-range page, and the utility roster is machine-readable.

  `Pagination` given a `page` beyond `pageCount` rendered a pager with
  `aria-current="page"` on nothing — assistive tech reported no current page. It
  now renders from an effective page clamped into `[1, pageCount]`, warns in
  development, and renders no page buttons when there are no pages (D78).

  `guidance.json` gains `utilities` — every utility class, generated from the same
  source as the CSS. The icon set got this in 0.15.0; the 146 utility classes had
  no machine-readable form at all, so `psi-m-*` and `psi-p-*` could only be found
  by reading `utilities.css` (D79).

## 0.15.0

### Minor Changes

- ef349ef: The manifest carries the icon roster. `manifest.json` gains `icons: string[]`,
  so the icon set has a machine-readable form for the first time — consumers and
  agents no longer have to read the barrel to know what exists.

## 0.14.2

### Patch Changes

- c3ebceb: Fix: `IconMoreHorizontal` is importable (D74)

  0.14.0 shipped `IconMoreHorizontal` and a `row-actions` pattern whose preset
  renders it:

  ```jsx
  trigger={<IconButton aria-label="Actions" variant="ghost"><IconMoreHorizontal /></IconButton>}
  ```

  but the icon was never re-exported from the package root, so that preset was
  code no consumer could compile:

  ```
  TS2305: Module '"@handamade/psi-react"' has no exported member 'IconMoreHorizontal'.
  ```

  `src/index.ts` re-exports icons through a hand-written list, and the new icon
  was added to `src/icons/index.ts` only. Everything in-repo stayed green: the
  build compiles the barrel, and the pattern validator resolved the requirement
  against the **source directory**, where the file plainly exists.

  That resolution target was the actual defect. D71 added `requires` so a pattern
  could not reference an affordance that does not exist, and its own comment
  claimed reading the directory meant "a file that exists but was never exported
  still fails to resolve" — which is the opposite of what reading a directory
  does. It now resolves against the package's public export surface, so an icon
  that is not importable cannot satisfy a pattern.

  Two tests pin it: every icon in the barrel must be re-exported from the root,
  and every rooted icon must have a file. With the export removed, three tests
  fail — including the backlog-empty gate, because `row-actions` correctly goes
  blocked.

  Found by the D68 external consumer run against the published 0.14.0 tarball —
  the second real packaging bug that gate has caught, and the second invisible to
  every in-repo check.

## 0.14.1

### Patch Changes

- 52ac567: The manifest now describes `children`, and patterns can set `aria-*` (D72–D73)

  `dist/manifest.json` listed `children` for 12 of 34 components while 31 accept
  it, so an agent cross-checking its output strictly against the manifest — which
  is exactly what the generation eval asks for — would flag correct code as an
  invented prop. Three consecutive eval runs reported it.

  The cause was not the prop filter, which is what the previous cycle recorded.
  Measured against the real parser: **`react-docgen-typescript` reports
  `children` only when the declaration carries a JSDoc comment.** Whether the
  interface extends an `HTMLAttributes` type, and whether the type is written
  `ReactNode` or `React.ReactNode`, make no difference — all four combinations
  drop it, and adding a comment to any of them restores it. The twelve that
  worked were simply the twelve that documented it.

  So `children` is now documented on all 31 components that take it. `Input`,
  `Pagination` and `MenuSeparator` still omit it, and should: publishing a prop
  that does not apply is worse than omitting one that does.

  **Patterns can also set `aria-*` props on any component.** Previously the
  pattern validator rejected `aria-label` on `Input` because the manifest had no
  such prop, which left the shipped `filter-toolbar` pattern with a `Select` that
  had no accessible name. Every component spreads its rest props onto a DOM
  element, so every `aria-*` attribute is valid on every one of them — the
  manifest's silence was never a claim otherwise. `filter-toolbar` now names both
  of its controls.

  No runtime change: the component declarations are documented re-statements of
  members the prop types already had.

## 0.14.0

### Minor Changes

- 30da157: DescriptionList, IconMoreHorizontal, and patterns that can render themselves (D70–D71)

  The 2026-08-07 generation eval returned two improvisations, and both were the
  same defect: **a shipped pattern whose required parts did not all exist.**
  `row-actions` specified an icon trigger the 25-icon set had no glyph for;
  `detail-drawer`'s entire body was the sentence "[key-value summary of the
  selected record]". Both declared `gaps: []` truthfully, because `gaps` only
  covers components named in `compose` — and what was missing was named in
  `content`, as prose, where nothing looked.

  **New — `DescriptionList` + `DescriptionItem`:** a `<dl>` of term/value pairs.

  ```tsx
  <DescriptionList layout="inline">
    <DescriptionItem term="Date">7 Aug 2026</DescriptionItem>
    <DescriptionItem term="Amount">$1,240.00</DescriptionItem>
  </DescriptionList>
  ```

  `stacked` (default) puts the term above its value; `inline` is a two-column
  grid, which is what a drawer wants. The term is a prop and the value is
  children, matching `Field`'s `label` idiom. Each item renders
  `<div><dt/><dd/></div>` — the HTML5 grouping element — so the native
  term/value association assistive tech relies on stays intact.

  **New — `IconMoreHorizontal`**, the ellipsis glyph `row-actions` always asked
  for.

  **Patterns can now declare the affordances their content depends on**, via an
  optional `requires` array resolved against the manifest (`kind: "component"`)
  or the icon roster (`kind: "icon"`). An unresolved entry becomes a gap, which
  blocks the pattern through the machinery that already existed — now fed from
  content as well as from the compose tree. `row-actions`' preset emits
  `<IconMoreHorizontal />` instead of `[icon]`, and `detail-drawer`'s emits a
  real `DescriptionList` instead of a sentence. Both presets are now code you
  can paste.

  This does not make the bug impossible — nothing can stop an author from
  writing a placeholder and declaring nothing — so the build also prints every
  bracketed content placeholder (19 today, 17 of them legitimately consumer
  copy), making a new silent one visible rather than invisible.

  Also fixed: `packages/react/README.md` omitted `utilities.css`, listing four
  stylesheets where there are five, and `guidance.rules` now states when a
  control takes a `Field` and when it does not — `filter-toolbar` and
  `table-pagination` previously contradicted each other.

## 0.13.1

### Patch Changes

- d51e60b: Fix: the documented stylesheet import now typechecks (D68)

  ```ts
  import "@handamade/psi-react/styles";
  ```

  — what every doc tells you to write — was a TypeScript error in a standard
  TypeScript + Vite consumer:

  ```
  TS2882: Cannot find module or type declarations for side-effect import
  ```

  `vite/client` declares `*.css`, which covers the four
  `@handamade/psi-tokens/*.css` imports, but `./styles` carries no `.css`
  extension so the glob never matched it, and the export had no `types`
  condition to fall back on. Only the undocumented `./styles.css` spelling
  worked.

  Both spellings now carry a `types` condition pointing at an emitted
  `dist/styles.d.ts`, so either one typechecks. No API change and no runtime
  change — the CSS shipped is identical.

  Found by the arc's first external consumer run: a scratch npm project outside
  the workspace, installing the published 0.13.0 tarballs. The bug was invisible
  in-repo because pnpm links resolve the package through the filesystem and never
  evaluate an export condition. `scripts/package-exports.test.ts` now guards the
  conditions, the declaration's existence, and that every export target lives
  under `dist/` and survives a build.

## 0.13.0

### Minor Changes

- f3e8f08: Tabs — the coverage arc's last gap (D67)

  Adds `Tabs`, `TabList`, `Tab` and `TabPanel`, closing `tabbed-workspace`.
  **Every composition pattern now composes only components that exist.**

  ```tsx
  <Tabs value={view} onValueChange={setView} orientation="horizontal">
    <TabList aria-label="Saved views">
      <Tab value="all">All</Tab>
      <Tab value="flagged">Flagged</Tab>
    </TabList>
    <TabPanel value="all">…</TabPanel>
    <TabPanel value="flagged">…</TabPanel>
  </Tabs>
  ```

  - **Controlled-only**, per D50/D53/D62: `value` and `onValueChange` are
    required, there is no `defaultValue`, and Tabs never selects itself.
  - **Values are strings, not indices** — an index breaks the moment a tab is
    inserted. `Tab` and `TabPanel` pair by value, so source order need not match.
  - **Automatic activation**: arrow keys move focus and selection together, along
    the orientation's axis, with wrap. Home/End jump to the first/last enabled
    tab. Disabled tabs are skipped and use `aria-disabled`, so they stay
    discoverable. There is no manual-activation mode.
  - **Every panel renders; unselected ones get `hidden`**, so `aria-controls`
    always resolves and panel DOM state survives a switch. For an expensive
    panel, render less _inside_ it rather than omitting the `TabPanel`.
  - `TabList` owns the roving tabindex — the whole list is one tab stop, and
    `Tab` from it lands on the active panel.

  New `--psi-tabs-*` tokens aliasing the semantic layer and the D54/D55 control
  ramp. No new contrast pairs.

  Also widens the D46 `border` scope group to accept the logical longhands
  (`border-inline-start` and siblings). The group already carried every physical
  longhand and both logical shorthands, so their absence was an omission — and
  the logical form is the one that survives RTL. Found by the gate itself.

## 0.12.0

### Minor Changes

- a4cdcca: Dialog gains `placement` — a drawer is a placement, not a component (D66)

  ```tsx
  <Dialog open onClose={…} placement="inline-end" title="Transaction detail" />
  ```

  `placement` is `center | inline-start | inline-end`, defaulting to `center`.
  The `inline-*` values pin the panel full-height to that edge — that is Psi's
  drawer / side sheet, and **there is deliberately no `Drawer` component**.

  Everything a drawer needs beyond position, `Dialog` already owns: `showModal()`
  modality, the platform focus trap, `aria-modal`, focus restore, the inert
  background, `onClose(reason)` across esc/backdrop/close-button, the
  `dismissible` gate, and the title/footer slots. A sibling component would have
  to duplicate or wrap all of it — which is how a design system ends up with two
  subtly different focus traps.

  - **Placement changes position and nothing else.** Modality, focus behaviour
    and the dismissal reasons are identical under every value; a test asserts the
    full dismissal contract holds for all three.
  - **Logical, not physical** — `inline-start` / `inline-end`, so an RTL theme
    flips without a second code path.
  - `width` (`400 | 560 | 720`) is reused as the drawer's width; the height is
    always the viewport.
  - A drawer's panel scrolls internally so a `dismissible={false}` footer stays
    reachable.

  The `detail-drawer` composition pattern is unblocked and now composes `Dialog`,
  so an agent asking for a slide-over gets working JSX. No new tokens and no new
  contrast pairs — the drawer binds the existing `--psi-dialog-*` family.

## 0.11.0

### Minor Changes

- 28cf5cd: Toast — the feedback tier (D64–D65)

  Adds `Toast`, `ToastRegion`, `ToastProvider` and `useToast()`, closing the
  `action-feedback` pattern's gap. Drawer and Tabs are the coverage arc's
  remaining two.

  - **`Toast`** is presentational and controlled, like Dialog (D50) and Menu
    (D53): it holds no state, runs no timer and never removes itself —
    `onDismiss` reports and the owner disposes. Variants are Tag's status axis
    (`neutral | success | warning | danger`), not the flat action variants, and
    each variant's meaning is announced by a visually hidden status word rather
    than by colour alone.
  - **`ToastRegion`** renders two always-present live wrappers (polite and
    assertive) and routes toasts between them by variant. Both stay mounted when
    the queue is empty, because a live region only announces mutations to a
    subtree that already existed. It sits on the native top layer via
    `popover="manual"`, so a toast raised while a modal `Dialog` is open is still
    painted above the backdrop and still announced — though not clickable until
    the dialog closes, since `showModal()` makes everything outside the dialog
    inert.
  - **`ToastProvider` + `useToast()`** own the queue, the eviction limit and the
    auto-dismiss timers. Timers pause while the pointer or focus is inside the
    region and resume with the time remaining (WCAG 2.2.1); toasts carrying an
    action get a longer lifetime so the affordance cannot vanish before it is
    reached.

  New tokens: `--psi-toast-*`, aliasing the shared surface family. Three contrast
  pairs join the WCAG AA matrix (`fgSuccess`/`fgWarning`/`fgDanger` on
  `bgSecondary`), all passing across light, dark, acme and ember.

  Also adds the `IconInfo`, `IconAlertTriangle` and `IconAlertCircle` icons.

## 0.10.0

### Minor Changes

- 1bc82f1: Table family and Pagination — ledger arc cycle 2 (D62–D63).

  `Table` ships as a compound family of six — `Table`, `TableHead`, `TableBody`,
  `TableRow`, `TableHeaderCell`, `TableCell` — rendering native
  `<table>/<thead>/<tbody>/<tr>/<th>/<td>` semantics, so it is legible to screen
  readers without ARIA reconstruction.

  It holds no state. `sort`/`onSortChange` and `selected`/`onSelectionChange` are
  controlled, extending D50 and D53, so the same code works unchanged against a
  backend that sorts and paginates. `sortable` and `selectable` only enable the
  affordances; `size` is `32 | 40 | 48` px with rows aliasing the D54/D55 control
  ramp, so a 32px row and a 32px Button are the same 32px from one source.

  `numeric` cells align right **and** render tabular figures, via a new
  `--psi-font-variant-numeric` token also exposed as a `.psi-tabular` utility — a
  column that aligns but whose digits jitter between rows defeats the purpose.

  `Pagination` is a standalone numbered pager with ellipsis truncation,
  `aria-current="page"`, a labelled `nav` landmark, and an inert ellipsis. It is
  not a Table family member: the `table-pagination` pattern composes it as a
  Toolbar sibling of a page-size `Select`. `onPageChange` is required — unlike
  Table's `onSortChange`/`onSelectionChange`, nothing gates whether it matters,
  so an omitted handler is a dead control, not a documented no-op.

  `Checkbox` now declares `aria-label` on its own props interface (applying D60),
  so a table's row-selection checkbox — which has no visible label — is both
  nameable and discoverable in `manifest.json`.

  The `data-table` and `table-pagination` patterns are unblocked and render
  presets. `data-table`'s `head` slot was removed: only `body` yields children, so
  a `head` slot rendered as a prop rather than a header row.

  Also fixed: `emit-manifest.ts` selected docgen's first export positionally, so a
  source file exporting a helper before its component described the wrong export
  in the manifest. It now matches on `displayName` and throws on a mismatch rather
  than falling back silently.

## 0.9.1

### Patch Changes

- 92afb63: The search overview allocates its response budget by kind (D61).

  `search("")` used to fill topics, then patterns, then components until the
  6000-character budget ran out, so whichever kind came last absorbed all
  catalog growth — three more patterns was enough to starve components from six
  down to four. It now reserves a floor of eight components and derives the
  per-pattern summary cap from what remains, so a growing catalog shortens
  summaries instead of dropping items. The `blocked (gaps: …)` suffix is never
  trimmed, so the component backlog survives at any catalog size.

  No API change; keyword search results and ranking are unaffected.

## 0.9.0

### Minor Changes

- 1b7cf8d: No changes in this release.

  `@handamade/psi-tokens` is versioned in lockstep with `@handamade/psi-react`
  and `@handamade/psi-mcp`, so its version moves with theirs even when nothing
  in this package changed. Nothing in the token DSL, the palettes, the themes,
  the scales or the emitted CSS was touched — see the `psi-react` entry for
  what 0.9.0 actually contains.

## 0.8.1

Version bump only — no change to this package. `@handamade/psi-*` are released
in lockstep at one version number, so a fix in any one of them bumps all three.
The 0.8.1 fix is in `@handamade/psi-react` (Menu dismissal correctness, D58).

## 0.8.0

### Minor Changes

- dedb5b2: Control radius is now a token (D56)

  `border-radius` on Button, IconButton, Input, Select, Checkbox and Tooltip
  moves off the raw rungs and onto the `--psi-control-*` family introduced by
  D54–D55, completing it. One size-invariant dial, `--psi-control-radius`
  (default `var(--psi-radius-8)`), drives every control. The layer to
  override per component: `--psi-button-radius` (Button, and IconButton via
  the same token), `--psi-input-radius`, `--psi-select-radius`,
  `--psi-checkbox-box-radius`, and `--psi-tooltip-radius`.

  **No visible change.** Every default resolves to its current value, so the
  change is a rendered no-op by construction — CI's VR gate is what confirms
  that before merge.

  **What this unlocks.** A theme can retune control shape in one line, which
  the `Palette` + `SlotMap` contract could not express before:

  ```css
  [data-psi-theme="acme"] {
    --psi-control-radius: var(--psi-radius-4);
  }
  ```

  Checkbox and Tooltip cap themselves — `min(var(--psi-control-radius),
var(--psi-radius-4))` and `min(…, var(--psi-radius-6))` — so neither ever
  over-rounds a small object. The published radius scale's floor is
  `radius-4`, so Checkbox's cap is a no-op for every on-scale value a theme
  can set; it only bites if a theme reaches for an off-scale value like
  `0px`. Tooltip's higher ceiling does track a sharper theme, down to
  `radius-4`. Tag and Switch keep `--psi-radius-full`: pill-ness is component
  identity, not theme expression.

- e851be0: Control ramp: per-size geometry is now tokens (D54–D55)

  Height, padding, gap and font for Button, IconButton, Input and Select move
  out of CSS Modules into a shared `--psi-control-*` family, aliased per
  component as `--psi-{component}-{size}-{prop}` — the layer to override.

  **Visible changes.** Input and Select were flat at 8px inline padding at
  every size while Button scaled 8/12/16/20. They now bind a shared value ramp:

  | size | Input/Select padding | was |
  | ---- | -------------------- | --- |
  | 24   | 8                    | 8   |
  | 32   | 8                    | 8   |
  | 40   | 12                   | 8   |
  | 48   | 16                   | 8   |

  Input and Select at 48 also switch from `medium` to `regular`, now that
  `--psi-text-18-28-regular` exists.

  Buttons with a leading icon gain an optical inset — the icon sits one step
  closer to the edge than text (12 [icon] 8 [label] 16 at size 40) — and the
  icon/label gap now scales (4/8/8/8) instead of a flat 6px.

  Text-only Buttons are pixel-identical. `--psi-button-font` still overrides
  typography across all sizes.

- 44d7112: D53 — Menu, the overlay tier. `Menu` + `MenuItem` + `MenuSeparator` on the
  native Popover API: `popover="auto"` supplies the top layer and light dismiss;
  Psi supplies roving-tabindex keyboard navigation with typeahead, focus
  return, and dismissal reasons via `onClose("esc" | "outside" | "item-select")`.
  Controlled-only, like Dialog (D50): Esc and item activation only _report_ a
  dismissal — the popover stays open until the consumer flips `open`. Light
  dismiss (an outside click) is the one asymmetry, forced by the platform: the
  browser hides the popover itself before Menu can intervene, so `open` must
  still be flipped to keep React's state in sync. Zero new dependencies.

  Placement is CSS anchor positioning above the anchor floor (Chrome 125+ /
  Firefox 132+ / Safari 18.2+) and a `CSS.supports`-gated JS branch below it — a
  top-layer element's containing block is the viewport, so the fallback cannot be
  declarative. No collision flip below the anchor floor. Psi's documented browser
  floor is unchanged.

  New `--psi-menu-*` token family, pure indirection onto the D51 surface family,
  so brands retuning `--psi-surface-*` get Menu for free. New `row-actions`
  pattern takes the pattern index to four, all unblocked.

## 0.7.2

### Patch Changes

- 939e323: D46 follow-up (HAN-21): `accent-color` joins the `surface` property group in
  the scope vocabulary (it was a legitimate binding stylelint couldn't name), and
  the token build gains a scale-prefix guard — no semantic token's kebab name may
  start with a scale-family prefix (`space-|size-|radius-|text-|font-|duration-|ease-|z-`),
  closing the latent lookup-precedence shadow in both gates. llms.txt now states
  precisely what the stylelint rule covers (first-party CSS) and points external
  consumers at `dist/scope-map.json`.
- Declare the MIT license. All three packages were published with no `license`
  field, which npm reads as all-rights-reserved — the packages were installable
  but not legally reusable, contradicting the open-core intent. Adds
  `"license": "MIT"` to each package and an MIT `LICENSE` at the repo root
  (a copy also sits in each package directory — npm only auto-includes a LICENSE
  from the package's own folder, not the monorepo root).

## 0.7.1

### Patch Changes

- `guidance.tags` gains a `tagApi` note documenting Tag's spelling of subtle variants (`variant="accent" subtle` — subtle is a boolean prop, not a variant-union entry), closing the last 07-16 generation-eval docs gap. Landed with PR #43 which missed its changeset.

## 0.7.0

### Minor Changes

- e8ad93c: D51: shared `--psi-surface-*` elevated-surface token family + `Panel` component. Dialog's panel rebinds to the family (zero visual change). Scope gate now follows cross-family component-token refs.

## 0.6.0

### Minor Changes

- 2864521: D46 token scopes: semantic tokens declare the CSS property groups they may bind (`scopes` on token sources); the token build gates every component-token binding (through `oklch(from var())` derivations) and throws on violations; scopes are emitted into `dist/resolved/<theme>.json`, DTCG `$extensions.psi`, and a generated `dist/scope-map.json` consumed by the new `psi/token-scopes` stylelint rule. New inversion tokens `bgInverted`/`fgOnInverted` (tooltip rebind, zero visual change). Implementation surfaced two additional tokens (`fillStaticWhite` for the switch thumb, caught by the build gate) and property-group vocabulary refinements plus a checkbox `currentColor` refactor (caught by the stylelint gate on first run).

### Patch Changes

- 0d8cc5b: Ember: `fgOnAccent` deepened from the brand's warm black (l 0.25, 6.12:1 on
  the accent) to l 0.14 — 7.63:1, AAA for normal text. The warm black stays
  untouched everywhere else; only labels on the ember accent get darker.
  Field report: AA-passing contrast still read weak on the saturated orange
  with the mono button face on mobile OLED.

## 0.5.0

### Minor Changes

- b30e35c: New `Dialog` component (D50): modal on the native `<dialog>` top layer —
  controlled `open`/`onClose(reason)`, title/footer slots, width 400|560|720,
  dismissible gate over Esc/backdrop/close-button. First D45 slot contracts:
  `manifest.json` component entries now carry `slots` (authored for Dialog,
  explicit `[]` elsewhere), validated at build. New `--psi-dialog-*` tokens.
  The psi-mcp index passes slot contracts through (`get component:Dialog` returns them).
- 3a753a5: New `Field` component (D49): labeled form-row wrapper — label above, one
  message line below (error replaces description, aria-live), fieldset/legend
  group mode. Input and Select now consume FieldContext when wrapped:
  id/aria-describedby/aria-invalid/required are wired automatically (additive —
  standalone behavior unchanged). New `--psi-field-*` component tokens.

## 0.4.1

### Patch Changes

- 2b54f64: Agent-surface gap fixes from the HAN-8/HAN-17 verification sessions (HAN-16):

  - **psi-react**: every component now carries a one-line description (TSDoc →
    manifest.json → MCP briefs); NavBar styles raw anchors in its brand/nav-link
    slots (previously browser-default blue); `"./styles.css"` exports alias so
    TypeScript can type the side-effect import without `declare module`.
  - **psi-tokens**: NavBar gains `link-fg`, `link-fg-hover`, `focus-ring`
    component tokens.
  - **psi-mcp**: `getting-started` (topic + init-generated AGENTS.md) now lists
    the required `@handamade/psi-react/styles` import — omitting it renders
    every component unstyled; new `topic:themes` (theme list, data-psi-theme
    mechanics, customer themes) and `topic:scales` (space/size/radius/motion/
    layout values), both searchable — `search "space"` no longer returns empty.

## 0.4.0

### Minor Changes

- cd77458: D43/D44 — agent access. New package `@handamade/psi-mcp`: an MCP server (stdio via
  `npx @handamade/psi-mcp`, hosted Streamable HTTP at https://psi.kurkin.de/mcp) with two
  read-only tools — `search` (briefs over components/tokens/guidance) and `get` (full props,
  token formulas with resolved values in all four themes, topics) — answering from an index
  baked at publish from the generated artifacts. `npx @handamade/psi-mcp init [--claude]`
  generates a marker-delimited agent guide (AGENTS.md/CLAUDE.md) from the same index.
  tokens/react bump in lockstep; no API changes in either.

## 0.3.0

### Minor Changes

- b7b2a1e: D42 — the design system is now **Psi (Ψ)**. BREAKING (0.x minor per semver):

  - Packages renamed: `@handamade/tokens` → `@handamade/psi-tokens`, `@handamade/react` → `@handamade/psi-react`.
  - CSS API renamed: `--ds-*` → `--psi-*` custom properties, `.ds-*` → `.psi-*` utility classes, `data-ds-theme` → `data-psi-theme`, cascade layers `ds.*` → `psi.*`.

  Migration is mechanical: update the two dependency names, then string-replace `--ds-` → `--psi-`, `.ds-` → `.psi-`, and `data-ds-theme` → `data-psi-theme`. No token values, variants, or component APIs changed.

## 0.2.0

### Minor Changes

- fe67817: Site-scale & portfolio readiness (D27–D37): dark-first customer brands + ember
  theme; font roles (sans/serif/mono/display) with brand assignment; fluid
  display tier; serif/mono combos; motion tokens with reduced-motion zeroing;
  layout tokens (container, gutter, breakpoints export, z-index) + .ds-container;
  hairline/scrim alphas; Button href + outline variant + --ds-button-font; Card,
  NavBar, AspectRatio; media-tint recipe; arrow + social icons.

## 0.1.0

### Minor Changes

- 8c10d4b: AI-readability remediation: component-token layer, pixel-true typography, contrast gate hardening, palette scoping/theme registry, Figma parity, and AI-facing artifacts.

  **@handamade/tokens**

  - Added a component-token layer (`dist/components/*.vars.css` + `dist/components.css`) providing per-component CSS custom properties (button, input, select, checkbox, switch, tag, tooltip) derived from the semantic token layer.
  - Typography combos are now pixel-true, single-property `font` shorthands named `{size}-{lineHeight}-{weight}`. **Migration:** the old `--ds-text-{xs|sm|base|lg|...}-*` variables are replaced by `--ds-text-{size}-{lh}-{weight}` (e.g. `--ds-text-14-20-regular`). Update any consumers referencing the old scale names.
  - Hardened the contrast gate: checks now run over explicit component/label pairs (not just raw foreground/background combinations) and composite alpha colors against their actual backdrop in sRGB before evaluating contrast, closing gaps where translucent tokens previously passed incorrectly.
  - Gamut-clamping now emits explicit `GAMUT WARNING` diagnostics (theme, token, ΔE, clamped hex) during build instead of silently clamping out-of-gamut OKLCH values — surfaced for light, dark, and acme.
  - Packaging fixes: corrected `exports`/`files` so `dist/resolved/*`, `dist/dtcg/*`, `dist/components/*`, `dist/types/index.d.ts`, and `dist/guidance.json` are all resolvable by consumers.
  - Figma plugin parity: alpha channel support, number-valued variables, and text style generation now match the CSS output.
  - Added palette scoping and a customer theme registry so per-customer themes (e.g. `acme`) can be layered without leaking into the base semantic palette.
  - New AI-facing build artifacts: `guidance.json` (machine-readable usage guidance), DTCG-format token exports (`dist/dtcg/*.json`), a component `manifest.json`, generated per-component `docs/*.md`, and `llms.txt` files at the repo and package roots.

  **@handamade/react**

  - Consumes the new component-token layer and pixel-true typography variables.
  - Tooltip accessibility fixes (keyboard/focus and ARIA behavior).
  - Ships `manifest.json` and generated `docs/*.md` alongside the existing `dist/{index.js,styles.css,index.d.ts}` for AI/agent consumption.

  Storybook's token-docs pages (Color/Spacing/Typography) now read the active toolbar theme via Storybook globals, so the Color Tokens table shows swatches and hex values for the selected theme (light/dark/acme) instead of always showing light.
