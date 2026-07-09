# @dku/tokens

OKLCH formula-based design tokens. Code is the source of truth; all artifacts are generated.

## Installation

**In workspace:** use `pnpm install` at the root. **@dku/tokens** is a local workspace dependency.

**External packages:** install from the private registry with your configured credentials.

## Usage

Import tokens in your app's stylesheet:

```css
@import "@dku/tokens/base.css";
@import "@dku/tokens/light.css"; /* or dark.css, acme.css */
@import "@dku/tokens/components.css";
@import "@dku/tokens/utilities.css";
```

Then set the theme on your root element:

```html
<html data-ds-theme="light">
  <!-- your app -->
</html>
```

All tokens are CSS custom properties: `--ds-bg-primary`, `--ds-fg-secondary`, `--ds-space-12`, etc.

**utilities.css is required**: it carries `.ds-container`, `.ds-text-*`, `.ds-display-*` utility classes and the `prefers-reduced-motion` zeroing for all duration tokens (D30) — required for NavBar rendering and accessibility compliance.

## Creating a custom theme

Run `pnpm new-theme` to scaffold a customer brand theme (palette + slot mapping).

## Machine-readable artifacts

For AI and tooling, see [llms.txt](./llms.txt):
- `dist/resolved/{light,dark,acme}.json` — Every token with OKLCH, hex, and formula
- `dist/guidance.json` — Variant intent, usage rules, state derivation
- `dist/dtcg/{theme}.json` — W3C DTCG format export
- `dist/components/{name}.vars.css` — Component-specific token declarations

## Note

All files in `dist/` are generated. Never hand-edit. Modify `src/` and rebuild.
