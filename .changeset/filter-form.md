---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A labelled filter form (D87). Every new prop defaults to today's behaviour.

- **`Toolbar` gains `align?: "center" | "end"`**: `end` lines items up on their bottom edge, so controls under visible `Field` labels and a button without one share a control line. A `Field` in such a row ends on its control — no description or error line under it.
- **`Toolbar` gains `as?: "div" | "form"`**: `form` renders a real `<form>`, so a submit `Button` and Enter in a field submit it. Labelled, it is a named form landmark and takes no `role="group"`. The ref type widens to `HTMLDivElement | HTMLFormElement`.
- **`Input` is the size it names.** It is now `box-sizing: border-box`; under the browser's `content-box` every size rendered 4px over (32 → 36) and overflowed a `Field`. Consumers with a global border-box reset see no change; others see text inputs 4px shorter, at their stated size.
- **`Button` declares `type`**, so the manifest lists it. No runtime change.
- **New pattern `filter-form`**; `filter-toolbar` and `filter-form` point at each other; `cursor-pagination` is end-aligned, which puts its page-size select and pager on one line (they were 13px apart).
