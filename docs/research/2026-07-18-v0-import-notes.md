# v0 Design Systems 2.0 import — validation notes

Per the 0.4.0 spec (D43 companion): non-blocking release-week validation. Import Psi
into v0 (paid team plan required) using the repo-root `v0.json`, then record findings here.

## Import-notes to paste into v0's "notes" step

- Import all four token CSS files: `@handamade/psi-tokens/base.css`, one theme css
  (`light`/`dark`/`acme`/`ember`), `components.css`, and `utilities.css` (REQUIRED —
  `.psi-container` + reduced-motion zeroing live there).
- ALSO import `@handamade/psi-react/styles` — the component CSS ships as a separate
  export the JS does not import; without it every component renders unstyled
  (HAN-17 dogfood finding, 2026-07-19).
- Set `data-psi-theme="<theme>"` on the root element.
- Sizes are px numbers (24 | 32 | 40 | 48), never S/M/L. Variants are flat
  (accent, accent-subtle, neutral, neutral-subtle, ghost, danger, danger-subtle, outline);
  one accent per visual group; danger only for destructive actions.
- Components: `@handamade/psi-react` (React 19, ESM). Machine-readable inventory:
  `packages/react/dist/manifest.json`; token values: `packages/tokens/dist/resolved/*.json`.

## Checklist for the run

- [ ] Sources verified (repo mount, npm packages public)
- [ ] Starter app reviewed: correct CSS imports incl. utilities.css AND
      `@handamade/psi-react/styles`, theme attribute present
- [ ] Generated page uses only real variants/sizes (no primary/secondary, no sm/md/lg)
- [ ] Colors bound to var(--psi-*), nothing hardcoded
- [ ] Findings + `v0.json` corrections recorded below

## Findings

(append after the run)
