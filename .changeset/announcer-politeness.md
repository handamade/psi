---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

Announcements route by politeness, not only by tone (D83). Every default is
unchanged.

- **`Toast`** gains `politeness` (`"polite" | "assertive"`): when set, it
  decides which of `ToastRegion`'s live wrappers speaks the toast, so a success
  can interrupt; unset, the variant decides as before. It also gains
  `statusLabel`: a string replaces the visually hidden status word ("Success:",
  "Warning:", "Error:") with a translated one, and `null` drops it.
- **New `Announcement`**: visually hidden text that `ToastRegion` routes by its
  `politeness`, for an event that must be spoken and has nothing to show. It is
  not a live region and announces nothing outside a `ToastRegion`.
- **`ToastRegion`** spreads its remaining HTML attributes, `data-*` included,
  onto its root element, so it can carry `data-react-aria-top-layer`.
- **`useToast().show()`** accepts `politeness` and `statusLabel`.
- **New pattern `announcer`**: one `ToastRegion` holding visible toasts and
  `Announcement`s. 35 components, 14 patterns.
