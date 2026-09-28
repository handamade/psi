# Portal readiness: one announcer, a strict CSP, shell glyphs, and themes built outside the repo (D81)

Date: 2026-09-28. Status: **Implemented** on branch `d81-portal-readiness`.

Provenance: the first production consumer, an operator web portal, audited
Psi 0.19.0 against its own rules before building on it. Its rules are stricter
than any earlier consumer's:

- **one live-region writer for the whole application;**
- **a production content security policy of `default-src 'self'`, with no
  `img-src data:`;**
- **a client brand that must not appear in a public package.**

The audit found four gaps. Each is closed here.

## What's there today

1. **`Field` always writes `aria-live="polite"`** on its message line
   (`Field.tsx:89`). A consumer cannot remove it: `...rest` spreads onto the
   root, not the message line. An application that routes every announcement
   through one announcer has a second writer on every form.
2. **`Select`'s chevron is a `data:` SVG** (`select.module.css:10`). Under
   `default-src 'self'` the browser refuses the image, and the page raises a
   `securitypolicyviolation` the first time any `Select` renders. The SVG also
   baked in `stroke='#666'`, so the chevron ignored the theme: `chevron-fg` was
   declared and never used.
3. **No glyphs for an application shell:** no menu toggle, no collapse
   chevron (only `ChevronRight`/`ChevronDown`), no sign-out, and no card.
4. **A gated theme can only be built inside this repo.** `new-theme` writes
   `customers/<name>.ts` here, and the CSS emit plus the contrast and scope gates
   live in `scripts/`, which is not published. So a consumer's brand either ships
   publicly in `@handamade/psi-tokens`, or bypasses the gates as hand-written
   `--psi-*` overrides.

## Decisions

- **D81 — Psi can be the component basis of an application with a strict CSP
  and a single announcer, and can theme a brand it doesn't ship.**
  - **`Field` gains `announce` (default `true`).** `announce={false}` renders the
    message line without `aria-live`. The message still describes the control
    through `aria-describedby`; only the announcing moves to the application.
    The default is unchanged, so no existing consumer is affected.
  - **The `Select` chevron is drawn with two 4px gradient strokes, bound to
    `--psi-select-chevron-fg`.** It uses no `url()`, so a strict CSP renders it,
    and it follows the theme. A **stylelint rule now forbids `url()` in any
    component CSS Module**, with a message naming the CSP. Proven red on
    `select.module.css:10` before the fix.
  - **The D46 `text` scope group admits `background-image`.** A glyph drawn with
    gradients is foreground ink, the same role `fill` and `stroke` play on an SVG
    glyph, so an `-fg` token may paint it. `surface` does not gain it. The
    alternatives were rejected:
    - `currentColor` would darken the chevron to the primary text colour;
    - an unscoped custom-property alias would evade the scope gate rather than
      satisfy it;
    - renaming `chevron-fg` would break consumers.
  - **Four icons:** `IconMenu`, `IconChevronLeft`, `IconLogOut` and
    `IconSimCard`, in the house stroke style, bringing the set to 30.
  - **`@handamade/psi-tokens/theme` exports `buildThemeCss(name, definition)`
    and a `psi-theme` bin.** The definition is the `customers/<name>.ts` shape.
    **The gates are one implementation** (`src/theme/gate.ts`), and
    `scripts/build.ts` now calls it too, so a consumer's theme is held to exactly
    the bar Psi's shipped themes are. A failure throws `ThemeGateError`, listing
    every contrast failure and scope violation. The emitter moved from
    `scripts/emit-css.ts` to `src/emit/css.ts`, which the old path re-exports,
    and the component registry moved to `src/components/registry.ts`.

## Verification

- **Tests first.** Each change started from a failing test or lint:
  - Field: 2 new tests, red on assertion;
  - scopes: 1 new test, red;
  - icons: 1 new test, red on the missing modules;
  - theme build and CLI: 7 new tests, red on the missing module;
  - stylelint: red on `select.module.css:10`.
- **The refactor is byte-identical.** Every file of `packages/tokens/dist`
  (light, dark, acme and ember CSS, resolved and DTCG JSON, scope map, types) was
  snapshotted before moving the gates, then diffed after a clean rebuild: **no
  file changed**. Only new files appeared (`dist/theme`, `dist/cli`, and the
  compiled modules they import).
- **Compiling the gate's imports with `tsc` for the first time** surfaced two
  latent `SlotMap` casts that `tsx` never type-checked (`gamut.ts`,
  `emit/css.ts`), and a missing `differenceCiede2000` in the `culori` shim. All
  three are fixed. `@types/node` is now a dev dependency of `psi-tokens`, for the
  bin.

## Consequences

- **Visual regression:**
  - The `Select` stories and the icon gallery change by design. The stroke
    chevron replaces the SVG polyline, and the gallery gains four cells.
  - Baselines must be refreshed from CI's `vr-baselines` artifact, per
    `apps/storybook/vr/README.md`. They cannot be regenerated on macOS.
- **That portal** keeps its brand themes (light, and a dark sidebar
  sub-tree) in its own repository and builds them with `psi-theme`. Nothing
  client-named ships in Psi.
