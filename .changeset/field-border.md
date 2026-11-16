---
"@handamade/psi-tokens": minor
"@handamade/psi-react": patch
---

Input, Select and Textarea draw their border at 3:1 or better in every theme (D120).

- **A field's border is now its control edge.** `--psi-input-border`, `--psi-select-border` and `--psi-textarea-border` bind `--psi-border-control`, the border an unchecked checkbox or radio already uses. They were on `--psi-border-neutral`, which measured 1.32–1.48:1 against the canvas. WCAG 1.4.11 asks 3:1 for the edge that identifies a control, and a field's fill is the canvas itself. **What changes for you:** every field in every theme draws a visibly darker edge. If you set one of these variables yourself, your value still wins.
- **A new token for hover, `--psi-border-control-hover`.** `fgPrimary` at 0.75 alpha in light-based themes and 0.60 in dark-based. The three fields' `-border-hover` bind it. It's a step darker than rest. The old hover, `--psi-border-strong`, would have been lighter than the new rest border.
- **The contrast gate checks it.** `nonTextPairs` gains `borderControlHover` on `bgPrimary` and `bgSecondary` at 3:1, so the build, `buildThemeCss` and `psi-theme` refuse a theme that breaks it. A theme that clears `--psi-border-control` clears this too.
- `--psi-border-neutral` and `--psi-border-strong` are unchanged. They keep their decorative uses, InlineAlert's neutral border and the outline Button.
