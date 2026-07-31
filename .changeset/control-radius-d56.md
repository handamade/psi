---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

Control radius is now a token (D56)

`border-radius` on Button, IconButton, Input, Select, Checkbox and Tooltip
moves off the raw rungs and onto the `--psi-control-*` family introduced by
D54–D55, completing it. One size-invariant dial, `--psi-control-radius`
(default `var(--psi-radius-8)`), drives every control. The layer to
override per component: `--psi-button-radius` (Button, and IconButton via
the same token), `--psi-input-radius`, `--psi-select-radius`,
`--psi-checkbox-box-radius`, and `--psi-tooltip-radius`.

**No visible change.** Every default resolves to its current value, so the
change is a rendered no-op by construction — CI's VR gate is what confirms
that before merge.

**What this unlocks.** A theme can retune control shape in one line, which
the `Palette` + `SlotMap` contract could not express before:

```css
[data-psi-theme="acme"] { --psi-control-radius: var(--psi-radius-4); }
```

Checkbox and Tooltip cap themselves — `min(var(--psi-control-radius),
var(--psi-radius-4))` and `min(…, var(--psi-radius-6))` — so neither ever
over-rounds a small object. The published radius scale's floor is
`radius-4`, so Checkbox's cap is a no-op for every on-scale value a theme
can set; it only bites if a theme reaches for an off-scale value like
`0px`. Tooltip's higher ceiling does track a sharper theme, down to
`radius-4`. Tag and Switch keep `--psi-radius-full`: pill-ness is component
identity, not theme expression.
