---
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
---

New `Dialog` component (D50): modal on the native `<dialog>` top layer —
controlled `open`/`onClose(reason)`, title/footer slots, width 400|560|720,
dismissible gate over Esc/backdrop/close-button. First D45 slot contracts:
`manifest.json` component entries now carry `slots` (authored for Dialog,
explicit `[]` elsewhere), validated at build. New `--psi-dialog-*` tokens.
