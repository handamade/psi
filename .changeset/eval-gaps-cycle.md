---
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
"@handamade/psi-mcp": minor
---

Pagination clamps an out-of-range page, and the utility roster is machine-readable.

`Pagination` given a `page` beyond `pageCount` rendered a pager with
`aria-current="page"` on nothing — assistive tech reported no current page. It
now renders from an effective page clamped into `[1, pageCount]`, warns in
development, and renders no page buttons when there are no pages (D78).

`guidance.json` gains `utilities` — every utility class, generated from the same
source as the CSS. The icon set got this in 0.15.0; the 146 utility classes had
no machine-readable form at all, so `psi-m-*` and `psi-p-*` could only be found
by reading `utilities.css` (D79).
