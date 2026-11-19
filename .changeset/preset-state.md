---
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

Every pattern preset now passes the MCP's `check` (D143). A pattern can declare the `state` it owns and the `inputs` its caller supplies, and its preset then renders as a small typed component that holds its `useState`: `row-actions` and `account-menu` open and close, `tabbed-workspace` switches, `table-pagination` pages, `app-shell`'s sidebar and groups toggle, and `destructive-confirm`, `detail-drawer` and `cursor-pagination` take `open`, `onClose` and their actions as props. `patterns.json` gains optional `state` and `inputs`; the other sixteen presets are unchanged. The build now rejects a pattern that leaves a required prop unbound.
