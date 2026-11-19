---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

The MCP knows icons and hooks, hints in Psi's own words, and component pages describe their own component (D145).

- **Icons in the MCP.** `manifest.json` gains `iconDetails` (the props every icon shares, `SVGAttributes`, and keywords per icon from `src/icons/keywords.json`) and `attributes.json` the icons' SVG attribute set. The MCP serves `icon:<Name>` and `icons:all` pages, `search` finds an icon by name or by what it shows (`search "delete"` → `IconTrash`), and `check` validates an icon's props instead of skipping it.
- **The overview names every component.** The empty-query overview carries one `component:*` row with the total and every component's name, and an `icons:all` row, in place of eight component briefs; pattern rows get the start of their intent instead of one word.
- **`check`'s hint ranks the component's own props first**: a close typo, then a prop that says the same in fewer words (`onValueChange` on `Combobox` → `onChange`, not the DOM's `onVolumeChange`), then a DOM attribute. The message names the Psi components the unknown prop belongs to.
- **Hooks are documented from their source.** `manifest.json` gains `hooks`; the Toast page tables `useToast()` (`show`, `announce`, `dismiss`, `clear` and their options) and the Field page `useFieldControl()`. `search "useToast"` finds `hook:useToast`.
- **Variant guidance is the component's own.** A generated doc lists only the variants its component takes (Tag: accent, neutral, danger, success | warning) and drops the section when none has guidance (Card, Skeleton). The `success | warning` entry no longer says "Tag only".
- **A destructive confirmation is `neutral` Cancel, `dismissible={false} closeOnEscape`.** The `destructive-confirm` preset and the Dialog page's confirm example now match the Dialog's own guidance (D101).
