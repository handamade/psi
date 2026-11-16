---
"@handamade/psi-tokens": minor
"@handamade/psi-react": patch
---

An unchecked Switch's track reaches 3:1 or better against its surface in every theme (D122).

- **The track is now a control fill.** `--psi-switch-track-bg` binds the new `--psi-fill-control`, the surface twin of `--psi-border-control` (a ref to it, so the two are one ink). It was on `--psi-fill-neutral4`, which measured 1.10–1.27:1. WCAG 1.4.11 asks 3:1 for what identifies a control. **What changes for you:** every unchecked Switch draws a mid-grey track (3.24:1 or better), and the white thumb shows clearly on it (3.47:1 or better). If you set `--psi-switch-track-bg` yourself, your value still wins.
- **A hover, `--psi-fill-control-hover`.** `fgPrimary` at 0.75 alpha in light-based themes and 0.55 in dark-based, bound by the new `--psi-switch-track-bg-hover` on an enabled, unchecked Switch. The checked track and the thumb don't change on hover.
- **The contrast gate checks it.** `nonTextPairs` gains six pairs: both tracks on `bgPrimary` and `bgSecondary`, and the white thumb on each track. The build, `buildThemeCss` and `psi-theme` refuse a theme that breaks them. If you override `--psi-border-control`, the Switch track moves with it.
- `--psi-fill-neutral4` is unchanged and keeps its other uses.
