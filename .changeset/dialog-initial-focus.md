---
"@handamade/psi-react": minor
---

A dialog that opens on the right control (D101). Every default is unchanged.

- **`initialFocus`**: a ref to the element to focus each time the dialog opens, after the platform's own focusing. React's `autoFocus` cannot do this, because the content mounts while the `<dialog>` is closed.
- **`closeOnEscape`**: whether Escape reports `onClose("esc")`, separately from the close button and the backdrop. It defaults to `dismissible`. A consequential confirmation is `<Dialog dismissible={false} closeOnEscape initialFocus={cancelRef}>`: focus starts on Cancel, Escape cancels, and there is no close button and no backdrop dismissal.
- **`closeLabel`**: visible text for the close button, which then renders as a ghost `Button` instead of the icon-only "Close dialog" button.
