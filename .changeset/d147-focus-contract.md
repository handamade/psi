---
"@handamade/psi-react": minor
---

D147: one focus contract. `Dialog`, `Menu`, `AppShell` and `ToastRegion` (and `ToastProvider`) take `onFocusReturn(event)`, called when Psi hands focus back: `event.target` is where focus is going, and `event.reason` says why (`"close"`, `"unmount"`, `"sidebar-close"`, `"toast-removed"`). Focus your own element in the handler to take over, or call `event.preventDefault()` to leave focus where it is. `Dialog` reports after the browser's own restore, so there `preventDefault()` does nothing. Without a handler nothing changes. Fixed: a toast removed after your code had already moved focus elsewhere no longer lets a later toast take focus. New types: `FocusReturnEvent`, `DialogFocusReturnReason`, `MenuFocusReturnReason`, `AppShellFocusReturnReason`, `ToastFocusReturnReason`. The new Focus guide, also `guide:focus` in the MCP, has the rule and the table of every move.
