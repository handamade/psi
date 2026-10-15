---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A checkbox and radio that show they are in error (D108).

- **An unchecked `Checkbox` or `Radio` marked `aria-invalid` outlines in the field error colour**, as Input, Select and Textarea do (`--psi-checkbox-box-border-error`, `--psi-radio-group-circle-border-error`, both `--psi-fg-danger`). A checked or mixed one keeps its accent.
- **`Checkbox` joins an invalid group `Field`:** inside `<Field group error>` every checkbox is now `aria-invalid`, as every `Radio` already was. It doesn't become `required`, because on a checkbox that would mean this particular box must be ticked. An `aria-invalid` you pass yourself still wins.
