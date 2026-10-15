---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A column and a line of text for pattern trees: `Stack` and `Text` (D109).

- **`Stack`**: a column with a gap from the space scale (`gap={4|8|12|16|24|32}`, default 16) and `align="stretch|start|center|end"`. It's a plain `<div>` with no role and no wrap: Toolbar's vertical counterpart.
- **`Text`**: one line or paragraph at a Psi text style. `as` takes p, span, div or h2–h4; `size` takes 12, 14, 16 or 18; `weight` is regular or medium; `tone` is primary or secondary. Margin is 0, so a Stack's gap does the spacing. Tokens `--psi-text-fg` and `--psi-text-fg-secondary` alias the gated foregrounds.
- **The `empty-state` and `feedback-form` presets** now lay out as columns. Before, empty-state ran its headline, explanation and button together on one line, and feedback-form stacked its fields and button flush.
