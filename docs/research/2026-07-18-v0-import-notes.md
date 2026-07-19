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

- [x] Sources verified (repo mount, npm packages public)
- [x] Starter app reviewed: correct CSS imports incl. utilities.css AND
      `@handamade/psi-react/styles.css` (all five layers, correct order), theme
      attribute present with a working 4-theme switcher
- [x] Generated page uses only real variants/sizes (no primary/secondary, no sm/md/lg)
- [x] Colors bound to var(--psi-*), nothing hardcoded (per v0's own build report;
      spot-checked visually across three themes)
- [x] Findings + `v0.json` corrections recorded below

## Findings

Run: 2026-07-19, v0 Design Systems 2.0, handamade team (paid plan), chat
`psi-design-system-mvdwSriiWZ3`. Import driven via the DS 2.0 dialog: GitHub
`handamade/psi@main` + `https://psi.kurkin.de` as "other link" + the notes
above pasted into Additional Notes. Import → saved design system took ~8.5
minutes of generation.

**What v0 captured (its own report, spot-verified):** all 11 components +
22 icons; the full token set — OKLCH color across the 4 themes, spacing,
typography (sans/serif/mono/display), radii, sizing, motion,
layout/breakpoints; system font stacks correctly identified (no external
fonts). Starter: Next.js with the five CSS layers wired in the documented
order (base → theme(s) → components → utilities → psi-react/styles.css), a
`data-psi-theme` provider with a light/dark/acme/ember switcher, clean `tsc`
and `next build`.

**Generation quality (three test pages, three themes):** an analytics
landing (ember), a settings page (light), a pricing page (dark). Conformance
was high across all three: accent budget held (exactly one accent CTA per
visual group, competitors stayed neutral/outline), ember's mono button face
and brand personality carried through, Tag `success` used for a "Verified"
badge, and — notably — the **sectionHeader recipe from guidance.json was
reproduced** (mono annotation + heading + hairline) without being asked,
which means v0 consumed the guidance artifact, not just the CSS.

**Corrections / notes for the next run:**

- `v0.json` (repo-root source-mount config) was never visibly consumed —
  the DS 2.0 dialog takes a GitHub URL directly and does its own repo walk.
  Keep the file only if v0 docs start referencing it again; the dialog is
  the real interface.
- The 0.4.1 pre-run fix mattered: the styles-import line in these notes is
  what got the fifth CSS layer wired. The 0.4.0-era notes would have
  produced an unstyled starter (see HAN-17).
- Import dialog quirk (v0 UX, not Psi): resizing the browser window while
  the dialog is open can drop focus into the page-level chat composer —
  re-open the dialog rather than retyping.
