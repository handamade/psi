---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A filter row whose fields can show an error (D92). The default and `align="end"` are unchanged.

- **`Toolbar` gains `align="start"`.** Items share their top edge, so every control under a one-line `Field` label starts on one line, and a direct `button` or `a` child drops by `--psi-toolbar-action-offset` onto that line. A field's description or error line hangs below its control and moves nothing else. Every label in such a row must be one line: a label that wraps pushes its control below the others. `align="end"` still requires a `Field` to end on its control.
- **New token `--psi-field-label-height`** (20px, the label's line box). `Field`'s label holds it as its `min-block-size`, which renders the same height as before.
- **New token `--psi-toolbar-action-offset`**: `calc(var(--psi-field-label-height) + var(--psi-field-gap))`, 26px. It is derived from `Field`'s tokens, so it moves with them when they are retuned at the theme root.
- **Pattern `filter-form` is start-aligned.** Its `intent` no longer forbids a description or error line in the row. The error line is the `Field`'s own, with its usual `aria-describedby` wiring, and every label must be one line.
