# Psi rename (D42)

Date: 2026-07-18. Linear: HAN-7. Companion to the GitHub–Linear–Slack pilot (Psi project, #psi-activity).

## Decisions

- **D42 — The design system is named Psi (Ψ).** Chosen over Phi. Rationale: (1) *perception* — psi's root is psyche, and ψ is the conventional symbol of the psychophysical function mapping stimulus to perceived magnitude, which is precisely what OKLCH's perceptual uniformity is for; (2) *the supergolden ratio* — ψ ≈ 1.4656, the real root of x³ = x² + 1, same lineage as φ's x² = x + 1 but one degree deeper: the golden-ratio trope, acknowledged and out-nerded; (3) *the glyph* — Ψ survives favicon sizes, while Φ collapses into Ø. The rename is total and breaking:
  - npm: `@handamade/tokens` → `@handamade/psi-tokens`, `@handamade/react` → `@handamade/psi-react`, `@handamade/figma-plugin` → `@handamade/psi-figma-plugin`. Old names to be npm-deprecated with pointers at next release.
  - CSS API: `--ds-*` → `--psi-*` custom properties, `.ds-*` → `.psi-*` utilities, `data-ds-theme` → `data-psi-theme`, cascade layers `ds.base/theme/components/utilities` → `psi.*`, stylelint rule `ds/component-tokens-only` → `psi/component-tokens-only`.
  - Repo: `handamade/s-ds-claude` → `handamade/psi` (GitHub redirects in place).
  - Historical docs (`docs/superpowers/`, eval run logs, CHANGELOGs) intentionally keep the old names — they record what was true when written.

## Consumer migration

Mechanical, no semantic changes: rename the two package deps, then string-replace `--ds-` → `--psi-`, `.ds-` → `.psi-`, `data-ds-theme` → `data-psi-theme` in app code. Token names, values, variants, and component APIs are otherwise identical.
