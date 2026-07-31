---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

D53 — Menu, the overlay tier. `Menu` + `MenuItem` + `MenuSeparator` on the
native Popover API: `popover="auto"` supplies the top layer and light dismiss;
Psi supplies roving-tabindex keyboard navigation with typeahead, focus
return, and dismissal reasons via `onClose("esc" | "outside" | "item-select")`.
Controlled-only, like Dialog (D50): Esc and item activation only *report* a
dismissal — the popover stays open until the consumer flips `open`. Light
dismiss (an outside click) is the one asymmetry, forced by the platform: the
browser hides the popover itself before Menu can intervene, so `open` must
still be flipped to keep React's state in sync. Zero new dependencies.

Placement is CSS anchor positioning above the anchor floor (Chrome 125+ /
Firefox 132+ / Safari 18.2+) and a `CSS.supports`-gated JS branch below it — a
top-layer element's containing block is the viewport, so the fallback cannot be
declarative. No collision flip below the anchor floor. Psi's documented browser
floor is unchanged.

New `--psi-menu-*` token family, pure indirection onto the D51 surface family,
so brands retuning `--psi-surface-*` get Menu for free. New `row-actions`
pattern takes the pattern index to four, all unblocked.
