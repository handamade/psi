---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

D42 — the design system is now **Psi (Ψ)**. BREAKING (0.x minor per semver):

- Packages renamed: `@handamade/tokens` → `@handamade/psi-tokens`, `@handamade/react` → `@handamade/psi-react`.
- CSS API renamed: `--ds-*` → `--psi-*` custom properties, `.ds-*` → `.psi-*` utility classes, `data-ds-theme` → `data-psi-theme`, cascade layers `ds.*` → `psi.*`.

Migration is mechanical: update the two dependency names, then string-replace `--ds-` → `--psi-`, `.ds-` → `.psi-`, and `data-ds-theme` → `data-psi-theme`. No token values, variants, or component APIs changed.
