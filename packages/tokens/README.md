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

All tokens are CSS custom properties: `--psi-bg-primary`, `--psi-fg-secondary`, `--psi-space-12`, etc.

**utilities.css is required**: it carries `.psi-container`, `.psi-text-*`, `.psi-display-*` utility classes and the `prefers-reduced-motion` zeroing for all duration tokens (D30) — required for NavBar rendering and accessibility compliance.

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
- `deriveTheme` solves both members of the pair independently to WCAG AA by binary-searching lightness, so a generated theme cannot fail the contrast matrix.
- `serializeCustomerTheme` emits the same `customers/<name>.ts` shape `pnpm new-theme` scaffolds by hand, plus the registry lines to wire it in.

## Machine-readable artifacts

For AI and tooling, see [llms.txt](./llms.txt):
- `dist/resolved/{light,dark,acme}.json` — Every token with OKLCH, hex, and formula
- `dist/guidance.json` — Variant intent, usage rules, state derivation
- `dist/dtcg/{theme}.json` — W3C DTCG format export
- `dist/components/{name}.vars.css` — Component-specific token declarations
- `dist/generate/` — Compiled `./generate` subpath (`parsePrompt`, `deriveTheme`, `serializeCustomerTheme`, and lower-level helpers)

## Note

All files in `dist/` are generated. Never hand-edit. Modify `src/` and rebuild.
