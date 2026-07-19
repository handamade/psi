---
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
---

New `Field` component (D49): labeled form-row wrapper — label above, one
message line below (error replaces description, aria-live), fieldset/legend
group mode. Input and Select now consume FieldContext when wrapped:
id/aria-describedby/aria-invalid/required are wired automatically (additive —
standalone behavior unchanged). New `--psi-field-*` component tokens.
