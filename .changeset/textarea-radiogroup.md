---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

Two more form controls: Textarea and RadioGroup (D104), and a `feedback-form` pattern that demands both.

- **`Textarea`**: the Input recipe on a native `<textarea>`, wired by a `Field` like `Input`. `minLength` and `maxLength` are native. With `maxLength`, a counter under the control shows `{length} / {maxLength}`. It is not a live region; it joins `aria-describedby`, so it is read with the field on focus. `showCounter={false}` hides it. There is no `size`: the height is `rows`, 3 by default.
- **`RadioGroup` and `Radio`**: native radios sharing one name, so the browser supplies Tab and the arrow keys. Controlled (`value`, `onValueChange`) or uncontrolled (`defaultValue`), with `disabled` and `orientation`. Inside `<Field group>` the fieldset and legend name the group and `RadioGroup` adds no role. Standalone, it is `role="radiogroup"` and needs `aria-label`. A required or invalid Field makes every radio `required` and `aria-invalid`.
- **Tokens** `--psi-textarea-*` and `--psi-radio-group-*`, all aliases of existing gated semantics, so no new contrast pair. `FieldContextValue` gains an optional `group` flag.
- **Pattern `feedback-form`**: a required category as radios, a bounded description with a counter, and a submit button. 50 components, 24 patterns.
