---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

Four feedback components (D86). None of them writes a live region; every default is unchanged.

- **New `Banner`**: a full-width, page-level message with `variant`, `title`, an `action` slot (a ghost Button), `onDismiss` and `statusLabel`. It shows the message and announces nothing; route the same event through the announcer.
- **New `InlineAlert`**: a message inside content, bordered in the variant's foreground colour. Despite the name it is not `role="alert"`.
- **New `Skeleton`**: a loading placeholder, always `aria-hidden`, that stops under `prefers-reduced-motion`. Put `aria-busy` on the region it stands in for.
- **New `CopyButton`**: a Button with a visible label that copies `value` and reports `"copied"` or `"failed"` through `onCopy`. It never changes its label; the application speaks the result.
- **Shared status vocabulary.** `Toast`'s icons and hidden status words moved into `Toast/status.ts`, now shared by `Toast`, `Banner` and `InlineAlert`. `Toast` renders as before.
- **Tokens.** `fgSuccess` and `fgWarning` gain the `border` scope, so the variant's foreground colour can draw a border. Three new contrast pairs are gated by the token build: `fgPrimary` on `fillTintSuccess`, `fillTintWarning` and `fillTintDanger`, each at 4.5:1. New component tokens `--psi-banner-*`, `--psi-inline-alert-*`, `--psi-skeleton-*`.
- **Patterns**: new `page-banner`, `form-feedback`, `loading-table` and `copyable-id`. 41 components, 20 patterns.
