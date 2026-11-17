---
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
---

A Combobox for searching a list and picking one value or several (D130).

- **New: `Combobox`.** Type to filter a list and pick from it. Options are data, `{ value, label, description?, disabled? }`. The default filter is a "contains" match on the label that ignores case and accents, so "zur" finds "Zürich". Pass `filter={fn}` to replace it, or `filter={false}` to filter the list yourself, with `loading` and a `moreMessage` line for a server-side search.
- **Single or several.** By default it picks one value (`string | null`). With `multiple` it picks several (`string[]`), shown as `Tag`s inside the control, which wraps and grows. Backspace in the empty input removes the last value.
- **Fits the rest of Psi.** Inside a `Field` it takes the label, description, error and required wiring, and `controlWidth` sizes it. A bare Combobox in a `Toolbar` takes the toolbar's control width. `name` writes hidden inputs, so a form submits the values, not the text. `clearable` adds a clear button. Sizes are 24 to 48, and a multi-select starts at 32.
- **Keyboard and screen readers.** It follows the ARIA combobox pattern. Focus stays in the input. Enter picks and never submits the form while the list is open. Esc closes the list without closing a surrounding `Dialog`. Disabled options are reachable but can't be picked. A polite live region says the number of results. Every name it adds can be translated: `clearLabel`, `toggleLabel`, `removeLabel`, `emptyMessage`, `loadingMessage` and `resultsLabel`.
- **The popup** is on the top layer, so it draws above a `Dialog`. It is at least as wide as the control, and it scrolls past `--psi-combobox-popup-max-height`, an alias of the shared `--psi-popup-max-height` (320px).
- **New tokens: `--psi-combobox-*`.** Each one aliases a value `Select` or `Menu` already uses, so a theme that styles those styles the Combobox too.
- **`Select` no longer accepts `multiple`.** A native multi-select showed about 1.5 rows of its list in a fixed-height box, and nothing could make it taller. **What changes for you:** remove `multiple` from any `Select` and use `<Combobox multiple>` instead. TypeScript now reports the prop as an error.
- **`Tag` takes `dismissLabel`**, the dismiss button's name, so several dismissible tags can each say what they remove ("Remove Berlin"). The default is still "Dismiss".
