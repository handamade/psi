---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

Control ramp: per-size geometry is now tokens (D54–D55)

Height, padding, gap and font for Button, IconButton, Input and Select move
out of CSS Modules into a shared `--psi-control-*` family, aliased per
component as `--psi-{component}-{size}-{prop}` — the layer to override.

**Visible changes.** Input and Select were flat at 8px inline padding at
every size while Button scaled 8/12/16/20. They now bind a shared value ramp:

| size | Input/Select padding | was |
|---|---|---|
| 24 | 8 | 8 |
| 32 | 8 | 8 |
| 40 | 12 | 8 |
| 48 | 16 | 8 |

Input and Select at 48 also switch from `medium` to `regular`, now that
`--psi-text-18-28-regular` exists.

Buttons with a leading icon gain an optical inset — the icon sits one step
closer to the edge than text (12 [icon] 8 [label] 16 at size 40) — and the
icon/label gap now scales (4/8/8/8) instead of a flat 6px.

Text-only Buttons are pixel-identical. `--psi-button-font` still overrides
typography across all sizes.
