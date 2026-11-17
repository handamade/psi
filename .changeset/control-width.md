---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A Field sizes its control, and a stacked form stops at 640px (D125).

- **`Field controlWidth={80 | 120 | 160 | 240 | 320 | 480}`.** The control the Field wraps — an Input, a Select, a Textarea, or a control built on `useFieldControl` — takes that width in px and shrinks in a narrower column. The label and the message line keep the Field's width. At size 32 an Input fits about 7, 12, 17, 26, 36 and 55 digits: an ICCID's 20 digits fit 240, a page-size Select fits 80. Without the prop nothing changes.
- **`FieldStack` is capped by a new token, `--psi-field-stack-max-width` (640px).** A stacked form in a page's main column was as wide as the column. **What changes for you:** a FieldStack wider than 640px is now 640px, at the start of its container. Set `--psi-field-stack-max-width` on a scope, `none` included, to change it for one form, or in a theme's `componentOverrides`.
- **A pattern can fill a Field's `error`.** `error` is now a slot of `Field`.
