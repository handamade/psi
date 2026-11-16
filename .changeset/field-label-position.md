---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

Labels beside their controls: `Field labelPosition` and `FieldStack` (D115).

- **`<Field labelPosition="start">`** puts the label before the control, with the message line under the control. The label still names the control, and the order is still label, control, message. The default, `"top"`, is unchanged.
- **`<FieldStack labelPosition="start" gap={8|12|16|24}>`** is a form whose Fields share one label column, as wide as the longest label up to `--psi-field-label-max-width` (240px). Under 480px of its own width, its labels return above their controls. A Field's own `labelPosition` wins, and a `start` Field inside a `"top"` stack keeps two columns of its own.
- **A group Field in the start position** renders `<div role="group">` named by its label, since a fieldset can't share a stack's columns.
- **New tokens:** `--psi-field-label-align` (`start`; a theme sets `end` to put labels against their controls), `--psi-field-label-max-width` and `--psi-field-column-gap`.
- **The `table-pagination` and `cursor-pagination` presets** put *Rows per page* beside its select, so the pager is one line high.
