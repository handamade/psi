---
"@handamade/psi-react": minor
---

`Banner` and `InlineAlert` set the margins of the paragraphs in their body (D95). No prop changes.

- **A direct `<p>` child has no block margin.** It used to keep the browser's `1em` margin, so its first line sat 14px below the top of the icon and the alert was about 28px taller than the same message as bare text. A paragraph now starts on the icon's line, as bare text does.
- **Consecutive paragraphs are 8px apart** (`--psi-space-8`), so a message of several paragraphs still reads as several.
- Only direct `<p>` children are affected. Bare text renders exactly as before, and a `<p>` nested inside other markup keeps its own styling.
- If you strip the margin yourself with `psi-m-0`, you can drop it. To change the gap before one paragraph, set a margin on that paragraph: since D94 a utility or your own unlayered class beats the component rule.
