# Motion presets (D141) — implementation plan

Spec: `docs/superpowers/specs/2026-11-18-d141-motion-presets-design.md`. Test-first: each
task writes its failing test, sees it fail, then implements.

**Order.** #195 (D139/D140) changes `scripts/build.ts`, `src/emit/**`, `src/scope-gate.ts`,
`navbar.module.css` and both `llms.txt`. Tasks 1 and 7 (spec, probe) run before it merges;
everything else waits for `gh pr view 195 --json state` to read `MERGED`, then
`git rebase origin/main`.

1. **Probe reduced motion.** Static page over the built `dist`, Playwright `emulateMedia
   ({ reducedMotion })` in Chromium and WebKit: a preset at `:root`, a page-scoped and a
   theme-scoped component alias, and each inside a `data-psi-theme` sub-theme. Done before
   the spec; numbers are in it. No emission fix needed.
2. **Source.** `scales.test.ts`: `motionPresets` has `feedback` 150/`standard`, `move`
   200/`soft`, `emphasis` 350/`standard`, and every step and easing is on the scale. Then
   `motionPresets` in `src/scales/motion.ts` with `satisfies`.
3. **Emission.** `emit-css.test.ts`: `base.css` declares the six `--psi-motion-*` tokens
   as `var()` aliases right after the easings. `emit-json.test.ts`: `scales.motion.presets`.
   `emit-dtcg.test.ts`: `motion.<name>.duration` = `{duration.150}`, `.ease` =
   `{ease.standard}` (check the file's existing alias syntax first). `guidance.test.ts`:
   `motion.presets` names each preset with an intent. Then `emitScaleVarsCSS`,
   `emit-json.ts`, `emit-dtcg.ts`, `guidance.ts`; `emit-types.ts` only if it lists scale
   tokens.
4. **Scale family `motion`.** `validator.test.ts`: a semantic `motion-foo` is rejected.
   Then `SCALE_FAMILY_PREFIX`, the stylelint plugin's `ALLOWED_GLOBAL`, `scope-gate.ts`'s
   `SCALE_RE`, and D139's base-value list in `src/emit/component-scope.ts` (a component
   token aliasing a preset is page-scoped: `emit-components.test.ts` / its own test).
5. **The duration gate.** `scope-gate.test.ts`: a registry default and a
   `componentOverrides` value for a `*-duration` key pass as `var(--psi-duration-150)` and
   `var(--psi-motion-move-duration)`; fail as `200ms`, `0.2s`, `calc(…)`,
   `var(--psi-duration-150, 1s)`, `var(--psi-duration-175)`, `var(--psi-motion-nope-duration)`,
   `var(--psi-motion-move-ease)`. A theme with a bad one fails `gateTheme` (theme-build or
   gate test) with the key and value in the message. Then the check in `scope-gate.ts`,
   wired where `gateTheme` collects violations.
6. **Lint and migration.** Stylelint fixture test (where `stylelint-token-scopes.test.ts`
   runs the plugin): `transition: color var(--psi-duration-150) var(--psi-ease-standard)` in
   a `*.module.css` is reported; the preset form is not. Then the rule, and the 16
   stylesheets: `Button`, `IconButton`, `Input`, `Select`, `Textarea`, `Combobox` (2),
   `Checkbox`, `RadioGroup`, `SegmentedControl`, `Switch` (2), `Tabs`, `NavTree`, `NavBar`
   → `feedback`; `Dialog` (4), `Toast` → `move`; `Card` → `emphasis`. Skeleton gets a
   `stylelint-disable-next-line` with D86. In `emit-utilities.ts`, `.psi-link` →
   `feedback`; `.psi-media-tint` keeps the scale with a D35 comment. `pnpm lint` green.
7. **Rerun the probe** on the built `dist` with the real emission.
8. **Docs.** `packages/tokens/llms.txt` Motion section (presets first, then the scale;
   reduced motion; the gate), `packages/tokens/README.md`, `packages/react/llms.txt` and
   `Card.tsx` / `Card.stories.tsx` (`hoverLift` over `emphasis`), the site's motion page
   (`[group].astro`: a presets table from `r.scales.motion.presets`), `guidance.ts`'s
   reduced-motion line. Changeset (tokens + react, minor). `CLAUDE.md` range: the highest
   merged number at merge time, never lower.
9. **Gates.** `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint &&
   pnpm --dir apps/site build && pnpm test:site`.
10. **PR.** Re-check D141 with `git grep -w` on `origin/*` and open PRs. Open, arm
    auto-merge, read it back (GraphQL if null). `vr` must report no change; show the user the
    run before any baseline is committed.
