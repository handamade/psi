---
"@handamade/psi-react": minor
---

Tabs and the navigation tree keep their contracts when the consumer's state is not the happy path (D93). No prop changes.

- **`Tabs`**: a `value` that matches no tab used to leave every tab at `tabIndex={-1}`, so the list had no tab stop. The first enabled tab now takes it (the first tab, when all are disabled). Nothing is selected: the selection stays yours. Development builds warn with the value that matched nothing. A selected tab that is disabled keeps the stop, as before.
- **`NavItem`**: `current` now also applies to a link you pass as the child. The single element child is cloned with `aria-current="page"`, so a router app no longer clones each link itself. Without `current`, the child's own `aria-current` is left alone.
- The exported `TabsContextValue` type gains two optional fields, `tabStop` and `registerTab`. A hand-written `TabsContext.Provider` that omits them keeps working: `Tab` falls back to `value`.
