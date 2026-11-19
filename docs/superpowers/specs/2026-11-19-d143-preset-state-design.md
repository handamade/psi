# Pattern presets hold the state they need and pass `check` (D143)

Date: 2026-11-19. Status: **Implemented** on branch `d143-preset-state`.

Provenance: D129's `check` tool reports `missing-required` on eight of the 24
pattern presets, so the MCP's own recipes fail the MCP's own check. D129's PR
listed it as a gap ("pattern presets fail `missing-required`"). A later
generation run found it again. This decision makes every preset pass `check`,
and keeps it that way with a build rule and a test.

D143 was free on every `origin/*` branch, in every local worktree and in the
one open PR on 2026-11-19. **Check the number again when the PR opens.**

## What's there today

`renderPreset` (`packages/react/scripts/patterns.ts`) turns a pattern's
`compose` tree into one JSX element. `renderPresetElement` mounts the same tree
in Storybook (`apps/storybook/src/patterns/Presets.stories.tsx`, D77). A prop
can hold a literal, a slot fill, `{param:key}` (D48) or `{content:key}`. Nothing
can hold state or a callback, and `validatePatterns` never reads a manifest
prop's `required`.

Measured on the 0.37.0 index, running every preset through `checkMarkdown`:

| Preset | Findings | Missing |
|---|---|---|
| `row-actions` | 5 | `Menu` `open`, `onClose`; `MenuItem` `onSelect` ×3 |
| `account-menu` | 4 | `Menu` `open`, `onClose`; `MenuItem` `onSelect` ×2 |
| `app-shell` | 2 | `NavGroup` `onOpenChange` ×2 |
| `cursor-pagination` | 2 | `CursorPagination` `onPrevious`, `onNext` |
| `destructive-confirm` | 2 | `Dialog` `open`, `onClose` |
| `detail-drawer` | 2 | `Dialog` `open`, `onClose` |
| `tabbed-workspace` | 2 | `Tabs` `value`, `onValueChange` |
| `table-pagination` | 1 | `Pagination` `onPageChange` |

20 findings, all `missing-required`; the other 16 presets are clean. Two more
defects sit beside them and `check` cannot see either, because the props
involved are optional: the menus' triggers have no `onClick`, so nothing opens
them, and `app-shell`'s menu button says `aria-expanded={true}` and toggles
nothing.

The docs examples already show the shape a working preset should have:
`packages/docs/examples/menu/basic.tsx` and `dialog/confirm.tsx` are small
components that hold `useState`, and every docs example passes `check` (D129).

## Decisions

### D143 — a pattern declares the `state` it owns and the `inputs` its caller supplies; props bind to them by placeholder; a preset with either renders as a typed component module, and every required prop must be bound

#### The vocabulary

`Pattern` gains two optional arrays:

```json
"state":  [{ "key": "open", "initial": false }],
"inputs": [{ "key": "open", "type": "boolean", "story": true },
           { "key": "onConfirm", "type": "() => void" }]
```

- `state` is what the pattern owns. Each entry is a `useState` with
  `initial` (a string, number or boolean literal).
- `inputs` is what the caller owns. Each entry is a prop of the wrapper with
  a TypeScript `type` string. `story` is the value Storybook passes; an input
  whose `type` is a function type (starts with `(`) gets a no-op in Storybook
  and needs no `story`. Any other input must have one.
- Keys are camelCase identifiers (`/^[a-z][A-Za-z0-9]*$/`). A key is unique
  across `state` and `inputs` together.

Five placeholders bind a prop to them, beside `{param:}` and `{content:}`.
They are legal in prop positions only, never in slots or text:

| Placeholder | Emits | For |
|---|---|---|
| `{state:open}` | `open` | a value: `open`, `value`, `page`, `aria-expanded` |
| `{set:open:false}` | `() => setOpen(false)` | `onClose` |
| `{toggle:open}` | `() => setOpen(!open)` | a trigger's `onClick` |
| `{setter:value}` | `setValue` | `onValueChange`, `onPageChange`, `onOpenChange` |
| `{input:onConfirm}` | `onConfirm` | anything the caller owns |

`{set:k:v}`'s `v` is `true`, `false`, a number, or a string written without
quotes; `{set:k:…}`, `{toggle:k}` and `{setter:k}` name a `state` key, and
`{toggle:k}` needs a boolean `initial`. `{input:k}` names an `inputs` key.
The setter's name is `set` + the key with its first letter capitalised.

#### What it renders to

A pattern with neither array renders exactly as today: one element,
byte-identical. A pattern with either renders a module in the docs examples'
style:

```tsx
import { useState } from "react";
import { Button, Dialog } from "@handamade/psi-react";

export function DestructiveConfirm({ open, onClose, onConfirm }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      …
    </Dialog>
  );
}
```

- The function is the pattern id in PascalCase (`row-actions` → `RowActions`).
- The `react` import appears only when there is `state`. The Psi import names
  every component and icon the tree uses (manifest components and D71 icon
  requirements, not intrinsic elements like `option`), sorted.
- The props parameter appears only when there are `inputs`, destructured in
  declaration order, with an inline type literal.
- One `const [k, setK] = useState(initial);` per `state` entry, in order.
- The element is the existing renderer's output, indented two levels inside
  `return (…);`.

Typing a callback input `() => void` is deliberate: one `onClose` then serves
both `Dialog`'s `onClose(reason)` and a button's `onClick`.

`renderPresetElement` builds the same thing: a component that calls `useState`
once per `state` entry, in order, and binds inputs to their `story` value (a
no-op for function types). It returns that component as an element, so
Storybook mounts working state, and D77's guarantee holds: JSON and story
cannot drift.

#### The eight patterns

| Pattern | `state` | `inputs` | Bindings |
|---|---|---|---|
| `destructive-confirm` | — | `open` (story `true`), `onClose`, `onConfirm` | `Dialog` `open`, `onClose`; Cancel `onClick` `{input:onClose}`; danger `onClick` `{input:onConfirm}` |
| `detail-drawer` | — | `open` (story `true`), `onClose`, `onSave` | `Dialog` `open`, `onClose`; Save `onClick` `{input:onSave}`; Close `onClick` `{input:onClose}` |
| `row-actions` | `open` = `false` | `onEdit`, `onDuplicate`, `onDelete` | `Menu` `open` `{state:open}`, `onClose` `{set:open:false}`; trigger `IconButton` `onClick` `{toggle:open}`, `aria-expanded` `{state:open}`; each `MenuItem` `onSelect` its input |
| `account-menu` | `open` = `false` | `onProfile`, `onSignOut` | as `row-actions`, on its `Button` trigger |
| `tabbed-workspace` | `value` = `"all"` | — | `Tabs` `value` `{state:value}`, `onValueChange` `{setter:value}` |
| `table-pagination` | `page` = `1` | — | `Pagination` `page` `{state:page}`, `onPageChange` `{setter:page}`; `pageCount` stays `10` |
| `cursor-pagination` | — | `hasPrevious`, `hasNext` (story `true`), `onPrevious`, `onNext` | `CursorPagination` all four |
| `app-shell` | `sidebarOpen`, `group1Open`, `group2Open` = `true` | — | `AppShell` `sidebarOpen` `{state:sidebarOpen}`; menu button `onClick` `{toggle:sidebarOpen}`, `aria-expanded` `{state:sidebarOpen}`; each `NavGroup` `open` and `onOpenChange` from its own state |

Why the split falls where it does:
- **A dialog's open state is its caller's.** A row action opens
  `destructive-confirm`; a table row opens `detail-drawer`. The preset has no
  trigger of its own; the `Dialog` docs page's example shows the trigger half.
- **A menu owns its open state; what its items do is the caller's.** `Menu`
  calls `onClose("item-select")` after an item is chosen, so `onSelect` needs
  only the caller's action.
- **Optional props are wired where the preset would not work without them**:
  the triggers' `onClick` and `aria-expanded`, and `app-shell`'s sidebar
  toggle. `check` cannot see these, so the pattern JSON is the only place to
  get them right.

#### Validation

`validatePatterns` adds:
- every prop the manifest marks `required` on a compose node is bound: by a
  prop entry (any value form), or by a slot of that name. `children` counts as
  bound when the node has `body` fills or `content`. An intrinsic node
  (`option`) has no manifest entry and is skipped.
- a binding placeholder names a declared key of the right kind; `{toggle:}`
  names a boolean state;
- every declared `state` and `inputs` key is used at least once (the same rule
  as an unreferenced param);
- `{set:}`, `{toggle:}`, `{setter:}` and a function-typed `{input:}` sit on a
  prop whose manifest type is a function (contains `=>`); `{state:}` and a
  non-function `{input:}` do not. A pass-through attribute the manifest does
  not list (`onClick`, `aria-expanded`) has no type to compare, so this rule
  skips it;
- keys are well-formed and unique; an input without a function type has
  `story`.

## Consequences

- `patterns.json` gains optional `state` and `inputs` on eight patterns, an
  additive change; their `preset` becomes a module string. The other 16 are
  byte-identical.
- The MCP's `pattern:` page already fences `preset` as `tsx`. Prose that says
  presets are "JSX" (`packages/react/llms.txt`, `packages/mcp/llms.txt`,
  `packages/docs/guides/ai.mdx`) says they are JSX, or a small component when
  the pattern holds state.
- `tools/verify-published.mjs` reads `<Tag` names from each preset; the
  module's import line names the same components, so the scan holds unchanged.
- Storybook: the eight patterns' stories change (both dialogs render open,
  Tabs shows a panel, `app-shell` is state-driven). Their `vr` baselines are
  refreshed from CI's render (D89). **Any ninth story moving is a bug**: the
  stateless output must not change.
- `check` reports state identifiers such as `open` as skipped computed values,
  which is correct and not a finding.

## File map

- `packages/react/scripts/patterns.ts`: `Pattern.state`, `Pattern.inputs`,
  the placeholders, validation, `renderPreset`'s module form,
  `renderPresetElement`'s stateful component.
- `packages/react/scripts/patterns.test.ts`, `render-preset.test.ts`,
  `render-preset-element.test.tsx`: unit tests.
- `packages/react/patterns/{row-actions,account-menu,app-shell,cursor-pagination,destructive-confirm,detail-drawer,tabbed-workspace,table-pagination}.json`.
- `packages/mcp/__tests__/presets.test.ts` (new): every preset in the baked
  index passes `checkMarkdown` with zero findings; every preset with state or
  inputs exports its PascalCase function.
- `packages/react/llms.txt`, `packages/mcp/llms.txt`,
  `packages/docs/guides/ai.mdx`: the preset wording.
- `apps/storybook/vr` baselines for the eight stories, from CI.
- `.changeset/preset-state.md`: minor for `psi-react` and `psi-mcp`.

## Verification

- Unit: `renderPreset` emits the module shape for each placeholder, imports,
  props type and `useState` lines; a stateless pattern's output is unchanged;
  `renderPresetElement` opens a menu on a trigger click and closes it through
  a `{set:}` binding, and passes a value input its `story` value; `validatePatterns` rejects an unbound required prop, an
  undeclared key, an unused key, a wrong-kind placeholder and `{toggle:}` on a
  non-boolean.
- `presets.test.ts`: zero `check` findings across all 24 presets.
- All five gates: `pnpm build && node tools/check-docs-drift.mjs && pnpm test
  && pnpm lint && pnpm --dir apps/site build && pnpm test:site`. `vr` in CI.

## Follow-ups

- The page-size `Select` in both pagination presets stays uncontrolled.
- `destructive-confirm`'s Cancel variant and its `Dialog` page disagree; that
  is its own docs change.
- `check`'s unknown-prop suggestion ranks DOM attributes above Psi's own props.
