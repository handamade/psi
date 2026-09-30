---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

Required in text, and custom controls join a Field (D84). Every default is
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
