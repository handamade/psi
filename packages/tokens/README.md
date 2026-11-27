# @handamade/psi-tokens

OKLCH formula-based design tokens. Code is the source of truth; all artifacts are generated.

## Installation

**In workspace:** use `pnpm install` at the root. **@handamade/psi-tokens** is a local workspace dependency.

**External packages:** install from the private registry with your configured credentials.

## Usage

Import tokens in your app's stylesheet:

```css
@import "@handamade/psi-tokens/base.css";
@import "@handamade/psi-tokens/light.css"; /* or dark.css, acme.css */
@import "@handamade/psi-tokens/components.css";
@import "@handamade/psi-tokens/utilities.css";
```

Then set the theme on your root element:

```html
<html data-psi-theme="light">
  <!-- your app -->
</html>
```

All tokens are CSS custom properties: `--psi-bg-primary`, `--psi-fg-secondary`, `--psi-space-12`, etc. Each theme also declares `color-scheme` (`light` or `dark`, from its base), so date pickers, select lists and scrollbars match it; an unlayered `color-scheme` rule of your own, one in a layer declared after `psi.theme`, or an inline style overrides it; one in `@layer psi.base` does not (D116).

**utilities.css is required**: it carries `.psi-container`, `.psi-text-*`, `.psi-display-*`, `.psi-fg-*` (D94) utility classes and the `prefers-reduced-motion` zeroing for all duration tokens (D30), which reaches the motion presets too — required for NavBar rendering and accessibility compliance.

### UI SDK

To theme UI SDK's default look (`@ui-sdk/core/web.css`) with Psi tokens, import the bridge after it, behind this layer line:

```css
@layer ui-sdk, psi.base, psi.theme, psi.components, psi.utilities, psi.ui-sdk;
@import "@handamade/psi-tokens/base.css";
@import "@handamade/psi-tokens/light.css";
@import "@handamade/psi-tokens/components.css";
@import "@handamade/psi-tokens/utilities.css";
@import "@ui-sdk/core/web.css";
@import "@handamade/psi-tokens/ui-sdk.css";
```

See the guide at `/docs/get-started/ui-sdk/`.

## Motion

Bind a motion preset, not two loose scale steps (D141). Each preset is a pair of tokens that alias the scale:

| preset | tokens | value | for |
|---|---|---|---|
| `feedback` | `--psi-motion-feedback-duration`, `--psi-motion-feedback-ease` | 150ms, `ease` | a control answering a pointer or a key |
| `move` | `--psi-motion-move-duration`, `--psi-motion-move-ease` | 200ms, `--psi-ease-soft` | something entering, leaving or changing size |
| `emphasis` | `--psi-motion-emphasis-duration`, `--psi-motion-emphasis-ease` | 350ms, `ease` | a deliberate change that draws the eye |

```css
.thing { transition: background-color var(--psi-motion-feedback-duration) var(--psi-motion-feedback-ease); }
```

Under `prefers-reduced-motion: reduce` every `--psi-duration-*`, and so every preset, is `0.01ms`. A theme's `componentOverrides` value for a `*-duration` key must be `var(--psi-duration-*)` or `var(--psi-motion-*-duration)`; the build refuses anything else.

## Creating a custom theme

Run `pnpm new-theme` to scaffold a customer brand theme (palette + slot mapping).

## Deriving a brand from a prompt

`@handamade/psi-tokens/generate` (D57) derives a brand at runtime instead of scaffolding one by hand:

```ts
import { parsePrompt, deriveTheme, serializeCustomerTheme } from "@handamade/psi-tokens/generate";

const vector = parsePrompt("a calm dark fintech brand");   // deterministic BrandVector
const pair = deriveTheme(vector);                          // AA-solved light + dark DerivedTheme pair
const { filename, source, registration } = serializeCustomerTheme(pair); // customers/<name>.ts
```

- `parsePrompt` is deterministic — an FNV-1a hash seeds a PRNG, so an unrecognised prompt still derives a coherent brand.
- `deriveTheme` solves both members of the pair independently to WCAG AA by binary-searching lightness; it never returns a below-AA theme, because it throws instead of returning one if the solver can't clear the matrix.
- `serializeCustomerTheme` emits `customers/<name>.ts` source in the CLI's own layout (`pnpm new-theme`'s `Palette` + `SlotMap`), extended to a pair: two `SlotMap`s (light and dark) and, unlike the CLI's override-free scaffold, the solved `ThemeDef` overrides each member needs to clear AA — the same kind of hand-tuned correction `acmeOverrides` carries in `customers/acme.ts`, but derived rather than hand-tuned.

## Building a theme outside this repo

`@handamade/psi-tokens/theme` (D81) builds a gated theme from a definition the consumer keeps in its own repository, so a client brand never has to ship in this package:

```ts
import { buildThemeCss, ThemeGateError } from "@handamade/psi-tokens/theme";

const { css, warnings } = buildThemeCss("acme-portal", {
  palette: { /* anchors */ },
  slots: { ink, canvas, accent, success, warning, danger },
  base: "light",            // or "dark" — e.g. a dark sidebar sub-tree
});
```

The definition has the same shape as a `customers/<name>.ts` theme. It passes the same gates as Psi's shipped themes, which run the same code (`src/theme/gate.ts`): a WCAG AA contrast failure or a D46 scope violation throws `ThemeGateError`, naming every failure. The CSS is scoped to `[data-psi-theme="<name>"]`; load it after `base.css` and set the attribute on any element. It declares `color-scheme` from `base`, `light` when none is named (D116).

From a build script: `psi-theme <definition.mjs|.ts> --name <name> [--out <file.css>]`, where the definition module default-exports the theme. Exit codes: 0 built, 1 refused by a gate, 2 usage error.

## Machine-readable artifacts

For AI and tooling, see [llms.txt](./llms.txt):
- `dist/resolved/{light,dark,acme,ember}.json` — Every token with OKLCH, hex, and formula, and the theme's `colorScheme` (D116)
- `dist/guidance.json` — Variant intent, usage rules, state derivation
- `dist/dtcg/{theme}.json` — W3C DTCG format export
- `dist/components/{name}.vars.css` — Component-specific token declarations
- `dist/theme/`, `dist/cli/psi-theme.js` — Compiled `./theme` subpath and the `psi-theme` bin (D81)
- `dist/generate/` — Compiled `./generate` subpath (`parsePrompt`, `deriveTheme`, `serializeCustomerTheme`, and lower-level helpers)

## Note

All files in `dist/` are generated. Never hand-edit. Modify `src/` and rebuild.
