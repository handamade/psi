---
"@handamade/psi-react": minor
---

Combobox follow-up (D134): Escape that keeps a value, `aria-expanded` that matches what shows, and three new props.

**Behaviour changes in single-select.** Code may rely on the old behaviour:

- **Escape no longer clears the text.**
  - It restores the picked label and closes the list if the list is open.
  - Closed, with unedited text, it does nothing and reaches a surrounding
    `Dialog`.
  - It never clears a value. Before, two Escapes and a blur deleted a picked
    value.
  - To clear a value, empty the text and leave the field, or use
    `clearable`.
- **Enter with edited text no longer submits the form.**
  - When nothing is highlighted, Enter settles the text as blur does: emptied
    text clears the value, and other edited text goes back to the picked
    label.
  - With the list open, it also closes the list.
  - Unedited text still submits natively.

Multi-select's Escape and Enter are unchanged.

**Accessibility.**
- `aria-expanded` is true only while a listbox with options shows. A "No
  matches" or loading line on its own leaves it false.
- While a "No matches", loading or "more" line shows, it is in the input's
  `aria-describedby`.

**New props.**
- `announce={false}` removes the Combobox's own live region, for an app
  that speaks through one announcer of its own, as `Field announce={false}`
  does.
- `valueLabel` (single-select) names a picked value the options don't hold,
  such as a preset id past the first page of a server-read list.
- `open` and `onOpenChange`. The list's open state can now be held by the
  caller, for example closed while a read has failed. Leave `open` unset and
  nothing changes.
