---
"@handamade/psi-react": minor
---

A tooltip you can move onto (D105).

- **`Tooltip` stays open while the pointer is on it** (WCAG 1.4.13, hoverable). Hover is handled by the wrapper that holds the trigger and the bubble, the bubble now takes the pointer, and a transparent bridge covers the gap between them. Leaving both still closes it at once; Escape and the 150ms open delay are unchanged.
- The trigger is no longer cloned with mouse handlers, so a child's own `onMouseEnter`/`onMouseLeave` run natively. No pixel changes.
