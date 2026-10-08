---
"@handamade/psi-react": minor
---

One queue for toasts and announcements (D91). Every existing call and default
is unchanged.

- **`useToast().announce(message, { politeness })`** speaks without showing
  anything. It renders an `Announcement` into the provider's one region, in the
  wrapper its `politeness` names (default `"polite"`), and returns an id that
  `dismiss()` accepts. It never renders a live region of its own.
- **An announcement has a lifetime Psi owns.** It leaves one second after it
  was added. A later announcement does not remove it early: removing a node
  just after it was added can cut its speech, and the non-atomic wrappers of
  D90 speak each added node on its own.
- **Announcements never count against `limit`**, so they cannot evict a visible
  toast. `clear()` removes both kinds, and unmounting the provider disposes
  every timer.
- **`ToastProvider` forwards region props** to its `ToastRegion`: `aria-label`,
  `ref`, `className` and `data-*` attributes such as
  `data-react-aria-top-layer`.
- **New type `AnnounceOptions`.** `Announcement`'s docs now state the lifetime
  rule; rendered by hand it is still the owner's to remove, after the same
  one-second dwell.
