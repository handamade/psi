---
"@handamade/psi-react": minor
---

Tabs and the navigation tree keep their contracts when the consumer's state is not the happy path (D93). No prop changes.

- **`Tabs`**: a `value` that matches no enabled tab used to leave every tab at `tabIndex={-1}`, so the list had no tab stop. The first enabled tab now takes it. Nothing is selected: the selection stays yours. Development builds warn with the value that matched nothing.
- **`NavItem`**: `current` now also applies to a link you pass as the child. The single element child is cloned with `aria-current="page"`, so a router app no longer clones each link itself. Without `current`, the child's own `aria-current` is left alone.
