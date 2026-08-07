# Plan — pattern affordances cycle (D70–D71)

Spec: `docs/superpowers/specs/2026-08-07-pattern-affordances-cycle-design.md`.

## Global constraints

- Never hardcode colours in component CSS — bind `var(--psi-*)`; the custom
  stylelint plugin enforces it.
- Component CSS may only bind its own `--psi-<module-name>-*` family plus the
  allowed globals `--psi-(space|size|radius|text|font|duration|ease|z)-`
  (D46 `psi/component-tokens-only`).
- Sizes are px numbers. Variants are the flat vocabulary. No S/M/L.
- New token values go in `packages/tokens/src`, never `dist`.
- **Four gates:** `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint`.
  `check-docs-drift` **will fail** until every stated count moves (32 → 34
  components, 25 → 26 icons). It is its own CI step; a green trio proves nothing.
- `pnpm vr` is CI-only.

## Tasks

1. **`IconMoreHorizontal`** — three dots, 24 viewBox, `size = 20` default,
   `aria-hidden`, matching the other 25. Export from `icons/index.ts`. Extend
   `icons.test.tsx` to cover it.

2. **`DescriptionList` tokens** — `packages/tokens/src/components/description-list.ts`,
   every value a `var(--psi-*)`. Terms bind `--psi-fg-secondary`, values
   `--psi-fg-primary`. Test asserts every value is a `var()` reference and that
   no key invents a family that does not exist (the D64 shadow lesson).

3. **Contrast** — confirm term-on-surface pairs are already in the matrix;
   add them if not. The token build is the WCAG gate and throws on failure.

4. **`DescriptionList` + `DescriptionItem`** — `<dl>` / `<dt>`+`<dd>`.
   `layout?: "stacked" | "inline"` (default `stacked`), `gap?: 8 | 12 | 16`.
   `DescriptionItem` takes `term` as a prop, value as children — `Field`'s
   idiom, not a two-slot shape. `slots.json` for both. Tests first: term/value
   association, both layouts, gap plumbing, native pass-through.

5. **Stories** — one per layout, plus an in-drawer story, so VR has something
   to baseline.

6. **D71 schema** — `requires?: Array<{content, kind, name}>` on `Pattern`;
   `loadPatterns` reads and type-checks it. Tests: a malformed entry throws;
   an absent `requires` still loads.

7. **D71 validator** — resolve `kind: "component"` against the manifest and
   `kind: "icon"` against the icon roster; unresolved entries join `gaps`, which
   already drives `blocked`. **Test the failure first**: a pattern requiring a
   nonexistent icon must come back blocked.

8. **D71 report** — non-fatal build output listing every bracketed content
   value, so a new silent placeholder is visible. Assert 19 today.

9. **Wire the two patterns** — `row-actions` declares `IconMoreHorizontal` and
   its preset renders it; `detail-drawer` declares `DescriptionList` and its
   body becomes a real `DescriptionList`. Both must stay `blocked: false`.

10. **Docs corrections** — README's five stylesheets; `CLAUDE.md`'s false claim
    about the README; the Field rule's *labeled*-control distinction;
    `filter-toolbar` gains explicit `aria-label`s.

11. **Counts** — `llms.txt` files, READMEs, any prose stating 32 components or
    25 icons. Run `check-docs-drift` until clean.

12. **Changeset** (`minor`), then all four gates, then PR with auto-merge armed
    and read back.

## Order

1 → 2 → 3 → 4 → 5 in one pass (the components), then 6 → 7 → 8 → 9 (the
validator, which needs the components to exist before the two patterns can
resolve), then 10 → 11 → 12.

Task 7 before task 9 matters: the validator must be seen failing on the real
patterns before they are wired, or the test proves nothing.
