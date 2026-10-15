---
"@handamade/psi-react": minor
---

An indeterminate checkbox you can see (D103).

- **`Checkbox` takes `indeterminate`.** It sets the input's DOM property, which the platform exposes as `aria-checked="mixed"`, and draws a dash in the checked colours (`check-fg` on the checked fill, the pair the checkmark already uses, so no new contrast pair). While the prop is passed it is written on every render, because a click clears the property before you re-render. When the prop is absent the property is left alone, so a state you set through the ref keeps working.
- `Table`'s select-all checkbox now uses the prop, so its mixed state no longer goes stale after a click.
