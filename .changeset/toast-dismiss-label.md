---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A `Toast` dismiss button with a name you can set (D117).

- **New `dismissLabel` prop** on `Toast`, on `show()` and on `ToastProvider`: the dismiss button's accessible name, for a translated app. It stays an icon button; only its name changes. A toast's own value wins, then the provider's, then the default `"Dismiss notification"`, so nothing changes for you unless you set it. The provider reads its value at render, so changing it renames toasts already on screen.
- It is not `Dialog`'s `closeLabel`, which gives the close button visible text. `Dialog`'s "Close dialog" and `Banner`'s "Dismiss" are still fixed names.
