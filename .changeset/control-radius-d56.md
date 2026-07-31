---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

Control radius is now a token (D56)

`border-radius` on Button, IconButton, Input, Select, Checkbox and Tooltip
moves off the raw rungs and onto the `--psi-control-*` family introduced by
D54–D55, completing it. One size-invariant dial, `--psi-control-radius`
(default `var(--psi-radius-8)`), is aliased per component as
`--psi-{component}-radius` — the layer to override.

**No visible change.** Every default resolves to its current value; the VR
suite reports zero diff pixels.

**What this unlocks.** A theme can retune control shape in one line, which
the `Palette` + `SlotMap` contract could not express before:

```css
[data-psi-theme="acme"] { --psi-control-radius: var(--psi-radius-4); }
```

Checkbox and Tooltip cap themselves — `min(var(--psi-control-radius),
var(--psi-radius-4))` and `min(…, var(--psi-radius-6))` — so a sharp theme
squares them while a soft theme never over-rounds a 16px checkbox. Tag and
Switch keep `--psi-radius-full`: pill-ness is component identity, not theme
expression.
