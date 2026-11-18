---
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
"@handamade/psi-mcp": patch
---

A `Field` wires every control the same way (D135).

- **Inside a `Field`, the Field's `id` wins over the control's own.** This changes which `id` wins: until now a caller's `id` on an `Input`, `Select` or `Textarea` beat the Field's and silently disconnected the label, so the control had no name. Now the control always takes the id the `<label for>` points at, and the caller's is not used. To give a control a known id, set it on the Field: `<Field htmlFor="email">`. In development the control warns once when a caller's `id` differs.
- **While the Field has an error, the control is `aria-invalid`; while it is required, the control is `required`,** whatever the caller passes. A caller's `aria-invalid={false}` no longer hides an error that is on screen. While the Field sets neither, a caller's own `aria-invalid` or `required` still stands. `aria-describedby` is joined, as before.
- **This includes a `Checkbox` in a group `Field`:** a caller's `aria-invalid={false}` on one box in an invalid group no longer clears it (it did since D108).
- **`Checkbox` and `Switch` take a `Field`'s wiring outside group mode,** as `Input` and `Select` do: its id, its message in `aria-describedby`, `aria-invalid` and `required`. They are named by the Field's label and their own, e.g. "Notifications Email me weekly", and described by the Field's error or description. A Field without a label leaves the box's own name. In a group Field they take `aria-invalid` only, `Switch` now as `Checkbox` does. Spreading `useFieldControl()` onto a box is no longer needed. That spread replaced the box's own name with the Field's label.
- **`--psi-toolbar-control-width` reaches the control of a top-labelled `Field`** that is a direct `Toolbar` child (an `Input`, a `Select` or a `Combobox`), as it reaches a bare control. A labelled filter row is now as even as an unlabelled one: the `filter-form` and `date-range-filter` presets' controls go from their content width (about 172, 80 and 141px) to 200px. A Field's `controlWidth` replaces the token. A side-labelled Field (`labelPosition="start"`, such as "Rows per page") keeps its content width. `Field` marks its root with `data-psi-field`.
