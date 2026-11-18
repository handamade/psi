---
"@handamade/psi-react": patch
"@handamade/psi-tokens": patch
---

Focus no longer drops to the page when a `Dialog` or a focused toast goes away (D136).

- **`Dialog` removed while open.** `{open && <Dialog open />}` removes the dialog on every dismissal, and the platform returns focus to the opener only on `close()`. Unmounting an open `Dialog` now closes it first, so focus returns to the opener as it does for `open={false}`. Nothing is reported through `onClose`.
- **A toast that held focus.** When a focused toast leaves, however it leaves (its dismiss button, a timer, eviction past `limit`, `clear()`, `dismiss(id)`, or a stack composed by hand), `ToastRegion` hands focus to the toast now at its position (its dismiss button, else its first control; the new last if it was last). Once the stack is empty, focus goes back to the element focused before focus entered the region, and to the region itself if that element is gone. A mouse click on a dismiss button goes back first, so focus left in the stack never holds the timers paused. Focus the user moved elsewhere is left alone.
- `ToastRegion` now has `tabindex="-1"` (focusable by script, never in the Tab order) and shows the focus ring on `:focus-visible`, from a new `--psi-toast-focus-ring` token bound to `--psi-border-focus`. `Toast`'s dismiss button carries `data-psi-toast-dismiss`.
