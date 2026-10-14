---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A button sizes the icon inside it (D97). **This changes how an icon in a `Button` renders.**

- **New tokens `--psi-button-{24,32,40,48}-icon-size`**, each half the button's height: 12, 16, 20 and 24px. They are derived from `--psi-button-{n}-height`, so a height retuned at the theme root moves the icon with it.
- **A direct `svg` child of a `Button` takes its size's token**, whatever the icon's own `size` prop: CSS beats the `width` and `height` an icon writes. An icon passed at the default 20 to a size-32 button now renders at 16, the size Psi's own buttons already drew. Pass icons to a `Button` without a `size`.
- A wrapped icon (`<span><Icon/></span>`) is not sized, just as it gets no optical inset. `IconButton` does not bind the ramp: its icon keeps its own size.
- `CopyButton` and `CursorPagination` follow the ramp: their icon is 16 at size 32 as before, and 12, 20 or 24 at the other sizes.
- `guidance.json` gains `geometry.label.iconSize` and `geometry.iconSize`.
