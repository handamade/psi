---
"@handamade/psi-react": minor
---

A menu with the full menu-button keyboard (D102).

- **The trigger names the menu it controls**: `aria-controls` with the menu element's id, which is generated unless you pass `id` to `Menu`.
- **Arrow Down / Arrow Up on the closed trigger open the menu** on its first / last enabled item. `Menu` cannot open itself, so it clicks the trigger, which is what Enter and Space already do. Your trigger's `onClick` must toggle `open`, as it already does for a click.
- **Tab and Shift Tab inside an open menu report `onClose("tab")`** and let focus move on to the next control. Before, the menu stayed open over the page.
- **Type change:** `onClose`'s reason union gains `"tab"` and is exported as **`MenuCloseReason`**. A handler that takes `(reason) => …` or ignores the reason is unaffected. A handler annotated with the old union now fails to type-check: annotate it with `MenuCloseReason`, as this repo's own promo Playground had to. An exhaustive `switch` over the reason needs the new case.
