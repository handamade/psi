# @handamade/psi-react

46 React 19 components consuming @handamade/psi-tokens. Zero runtime dependencies, CSS Modules, full TypeScript support.

## Installation

**Peer dependencies:** `react@^19.0.0`, `react-dom@^19.0.0`, `@handamade/psi-tokens@workspace:*`

**In workspace:** already installed. **External:** install from the private registry.

```bash
pnpm add react react-dom @handamade/psi-tokens
```

## Usage

Import components and their styles:

```tsx
import { Button } from "@handamade/psi-react";
import "@handamade/psi-react/styles";

// Also import token styles in your app root — all four, not three.
// utilities.css is required: .psi-container and the reduced-motion zeroing
// live there, and omitting it renders a working build subtly wrong.
import "@handamade/psi-tokens/base.css";
import "@handamade/psi-tokens/light.css"; // or dark.css
import "@handamade/psi-tokens/components.css";
import "@handamade/psi-tokens/utilities.css";

export default function App() {
  return <Button size={32} variant="accent">Click me</Button>;
}
```

## Cascade

Component styles ship in `@layer psi.components` (D94), so utilities such as
`psi-gap-24` or `psi-fg-secondary` win over a component's own values. The
flip side: **unlayered CSS in your app beats every Psi component rule,
whatever its specificity.** An unlayered reset like `button { padding: 0 }`
will strip a `Button`. Put resets and element rules in a layer below Psi's:

```css
@layer psi.base {
  button { padding: 0; font: inherit; }
}
```

or declare your own layer first:
`@layer reset, psi.base, psi.theme, psi.components, psi.utilities;`.

## Conventions

- **size** is a pixel number: `24 | 32 | 40 | 48` (never `"sm"`, `"md"`, `"lg"`)
- **variant** vocabulary: `accent`, `accent-subtle`, `neutral`, `neutral-subtle`, `ghost`, `danger`, `danger-subtle`
- One accent color per visual group; danger only for destructive actions

## Component docs

- [Per-component documentation](./docs/) — Props, theming, examples
- [manifest.json](dist/manifest.json) — Full prop inventory and defaults (for tooling)
- [llms.txt](./llms.txt) — Machine-readable component inventory and rules
