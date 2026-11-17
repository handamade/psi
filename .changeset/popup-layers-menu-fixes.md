---
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
---

A Menu that scrolls, keeps focus and reaches disabled items, and a shared cap for a popup's height (D131).

- **A long `Menu` scrolls.** Past `--psi-menu-max-height` it stops and scrolls, and the focused item stays in view as the keys move. 43 items used to run 1,567px down a 768px window; now the menu is 330px tall. A menu taller than the room on both sides of its trigger opens on the side with more room and fills it. **What changes for you:** a menu longer than about eight items now scrolls.
- **New tokens: `--psi-popup-max-height` (320px)**, shared by every popup, and **`--psi-menu-max-height`**, Menu's alias of it. Set the shared one in a theme to retune every popup, or the alias for menus alone.
- **Removing the focused item keeps focus in the menu.** A re-render that removes it moves focus to the item now at its position, or the new last item. An emptied menu holds focus itself, so Esc and Tab still report `"esc"` and `"tab"`. Before, focus fell to the page and the arrow keys stopped working.
- **Disabled menu items and tabs are reachable by the keyboard.** The arrow keys, Home, End and typeahead now land on a `MenuItem disabled`, and a menu whose first item is disabled opens on it; activating it still does nothing. In `Tabs`, the arrows and Home/End focus a disabled tab without selecting it, so the panel stays put. **What changes for you:** a test that expected the arrows to skip a disabled item now lands on it.
- Menu's popup and placement code moved into internal layers the coming `Combobox` shares, with no visible change.
