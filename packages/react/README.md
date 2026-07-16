# @handamade/react

11 React 19 components consuming @handamade/tokens. Zero runtime dependencies, CSS Modules, full TypeScript support.

## Installation

**Peer dependencies:** `react@^19.0.0`, `react-dom@^19.0.0`, `@handamade/tokens@workspace:*`

**In workspace:** already installed. **External:** install from the private registry.

```bash
pnpm add react react-dom @handamade/tokens
```

## Usage

Import components and their styles:

```tsx
import { Button } from "@handamade/react";
import "@handamade/react/styles";

// Also import token styles in your app root
import "@handamade/tokens/base.css";
import "@handamade/tokens/light.css"; // or dark.css
import "@handamade/tokens/components.css";

export default function App() {
  return <Button size={32} variant="accent">Click me</Button>;
}
```

## Conventions

- **size** is a pixel number: `24 | 32 | 40 | 48` (never `"sm"`, `"md"`, `"lg"`)
- **variant** vocabulary: `accent`, `accent-subtle`, `neutral`, `neutral-subtle`, `ghost`, `danger`, `danger-subtle`
- One accent color per visual group; danger only for destructive actions

## Component docs

- [Per-component documentation](./docs/) — Props, theming, examples
- [manifest.json](dist/manifest.json) — Full prop inventory and defaults (for tooling)
- [llms.txt](./llms.txt) — Machine-readable component inventory and rules
