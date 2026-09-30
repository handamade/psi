# Feedback Components (D86) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four presentational feedback components — `Banner`, `InlineAlert`, `Skeleton`, `CopyButton` — none of which writes a live region, with tokens, patterns and docs.

**Architecture:** The status vocabulary (icons, hidden words) moves out of `Toast` into `Toast/status.ts` and is shared. Each component is a folder under `packages/react/src/<Name>/` with its own CSS Module binding `--psi-<name>-*` tokens declared in `packages/tokens/src/components/<name>.ts`. Registration is the same for every component: `index.ts`, `scripts/emit-manifest.ts`, `a11y-meta.ts`, `a11y.axe.test.tsx`, a story file.

**Tech Stack:** React 19, CSS Modules, the token build (contrast + scope gates), Vitest + Testing Library, axe, Playwright over built Storybook.

Spec: `docs/superpowers/specs/2026-09-30-feedback-components-design.md`.

## Global Constraints

- Node 24; `node -v` first. Run tests with `pnpm vitest run <path>` (never `pnpm --filter <pkg> test`, which runs nothing).
- **No component here renders `role`, `aria-live`, `role="alert"` or `role="status"`.** The JSDoc of each says so in its first paragraph.
- Component CSS binds only `--psi-<component>-*` tokens and the scale families (`space|size|radius|text|font|duration|ease|z|focus-ring`); every colour goes through a token declared in `packages/tokens/src/components/<name>.ts` and registered in `registry.ts`. `pnpm lint:css` enforces it. No `url()`, no `style` prop, no literal colours, no literal outline geometry.
- Every focusable element draws the shared ring: use `Button`/`IconButton`, which already do.
- Tests first: write the test, run it red, then implement. The `pnpm build` of `@handamade/psi-tokens` is the contrast and scope gate.
- Counts after: **41 components, 20 patterns** (37 + 4, 16 + 4).
- Tasks 1–4 touch the same registration files, so they run **one after another**, never in parallel.
- Gates at the end: `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site`, then the full `pnpm test:e2e` (never `--grep <story word>`).

## Registration checklist (every component task)

1. `packages/tokens/src/components/<name>.ts` exporting `<name>Vars`, added to `registry.ts`; a test in `packages/tokens/__tests__/<name>-tokens.test.ts` pinning the keys (see `toast-tokens.test.ts` for the shape).
2. `packages/react/src/<Name>/<Name>.tsx`, `<name>.module.css`, `<Name>.test.tsx`, `<Name>.stories.tsx` (title `Feedback/<Name>`).
3. `packages/react/src/index.ts`: `export { <Name> } …; export type { <Name>Props } …`.
4. `packages/react/scripts/emit-manifest.ts`: add `"<Name>"` to `COMPONENTS` (after `"Announcement"`).
5. `packages/react/src/a11y-meta.ts`: an entry with `keyboard` rows and `notes`, notes opening with "Not a live region".
6. `packages/react/src/a11y.axe.test.tsx`: one or two cases.
7. `pnpm --filter @handamade/psi-tokens build && pnpm --filter @handamade/psi-react build`, then `pnpm vitest run packages/react packages/tokens` and `pnpm lint`. `git add` the generated `packages/react/docs/<Name>.md`.
8. Commit with a `(D86)` suffix and the `Co-Authored-By` trailer.

---

### Task 0: Shared status vocabulary, scopes, contrast pairs *(main session)*

- [ ] Create `packages/react/src/Toast/status.ts` exporting `type StatusVariant`, `statusIcons`, `statusPrefix`; `Toast.tsx` imports them. Toast tests unchanged and green.
- [ ] `fgSuccess`, `fgWarning`: add `"border"` to `scopes` in `themes/light.ts` and `themes/dark.ts` (and any customer theme that declares scopes). `scopes.test.ts`/theme tests updated if they pin the old value.
- [ ] `contrast-matrix.ts`: `{ fg: "fgPrimary", bg: "fillTintSuccess" | "fillTintWarning" | "fillTintDanger", minRatio: 4.5 }` with a D86 comment; a test in `contrast.test.ts` pinning the three pairs.
- [ ] Token build green for all four themes. Commit.

### Task 1: `Banner` *(agent)*

**Files:** `packages/tokens/src/components/banner.ts`; `packages/react/src/Banner/*`; registration files.

**Contract:**

```ts
export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: StatusVariant;            // default "neutral"
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;                 // a ghost Button
  onDismiss?: () => void;             // renders an IconButton labelled "Dismiss"
  statusLabel?: string | null;        // as Toast (D83)
  className?: string;
  ref?: Ref<HTMLDivElement>;
}
```

Anatomy, in order: `<span>` icon (`statusIcons[variant]`, `size={20}`, `aria-hidden`), `<div>` body holding `<span className="psi-sr-only">` word (unless `null`/absent), `<strong>` title when given, then children; `<div>` action when given; `IconButton variant="ghost" size={32} aria-label="Dismiss"` with `IconClose` when `onDismiss`. Root: `<div data-psi-banner data-variant={variant} className=…>`; rest props spread first.

Tokens `bannerVars`: `bg-neutral: var(--psi-fill-neutral3)`, `bg-success: var(--psi-fill-tint-success)`, `bg-warning: var(--psi-fill-tint-warning)`, `bg-danger: var(--psi-fill-tint-danger)`, `fg: var(--psi-fg-primary)`, `icon-fg-neutral: var(--psi-fg-secondary)`, `icon-fg-success: var(--psi-fg-success)`, `icon-fg-warning: var(--psi-fg-warning)`, `icon-fg-danger: var(--psi-fg-danger)`.

CSS: root `display: grid; grid-template-columns: auto 1fr auto auto; align-items: start; gap: var(--psi-space-12); padding: var(--psi-space-12) var(--psi-space-16); width: 100%; box-sizing: border-box; color: var(--psi-banner-fg); font: var(--psi-text-14-20-regular);` background per `[data-variant]`; title `font: var(--psi-text-14-20-medium); display: block;`. No radius, no border.

Tests (red first): renders children, title and the default word per variant (`Success:`/`Warning:`/`Error:`, none for neutral); `statusLabel` string and `null`; the action slot; dismiss button only with `onDismiss`, called once per click; icon `aria-hidden`; **no `role` and no `aria-live` anywhere in the tree**; `data-variant`; className merged; ref; a `data-testid` reaches the root. Stories: one per variant, `WithActionAndDismiss`, `TitleOnly`. Axe: neutral, danger with action and dismiss.

### Task 2: `InlineAlert` *(agent)*

Same contract as `Banner` minus `onDismiss`. Root `<div data-psi-inline-alert data-variant>`. Tokens `inlineAlertVars` (`--psi-inline-alert-*`, file `inline-alert.ts`, CSS `inline-alert.module.css`): the `bg-*`, `fg`, `icon-fg-*` keys as `Banner`, plus `border-neutral: var(--psi-border-neutral)`, `border-success: var(--psi-fg-success)`, `border-warning: var(--psi-fg-warning)`, `border-danger: var(--psi-fg-danger)`, `radius: var(--psi-radius-8)`. CSS: as `Banner` plus `border: 1px solid var(--psi-inline-alert-border-<variant>)` per variant and `border-radius: var(--psi-inline-alert-radius)`. JSDoc first sentence: "Not `role="alert"`, despite its name." Tests as `Banner`'s minus dismiss, plus: no `role="alert"`. Stories: one per variant, `WithAction`. Axe: two cases.

### Task 3: `Skeleton` *(agent)*

```ts
export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "block";   // default "text"
  lines?: number;               // text only, default 1
  size?: 24 | 32 | 40 | 48;     // block height, default 40
  className?: string;
  ref?: Ref<HTMLDivElement>;
}
```

Renders `<div aria-hidden="true" data-psi-skeleton data-variant>`; text variant renders `lines` child `<span>`s (the last one 60% wide when `lines > 1`); block variant one box of height `var(--psi-size-<n>)`. Tokens `skeletonVars`: `bg: var(--psi-fill-neutral4)`, `radius: var(--psi-radius-4)`. CSS: `@keyframes skeleton-pulse { from { opacity: 1 } to { opacity: 0.45 } }`; `.skeleton { animation: skeleton-pulse var(--psi-duration-600) var(--psi-ease-in-out) infinite alternate; }`; text line `height: var(--psi-space-12); margin-block: var(--psi-space-4)`; **and** `@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }` with the comment from the spec (an infinite alternating animation with a zeroed period flickers). Tests: `aria-hidden`; `lines={3}` renders three; block carries `data-size`; no `role`; className, ref, rest. Stories: `Text`, `ThreeLines`, `Block`, `InATable` (a `Table` with `aria-busy="true"` on `TableBody` and three rows of `Skeleton` cells). Axe: text and block.

### Task 4: `CopyButton` *(agent)*

```ts
export interface CopyButtonProps {
  value: string;
  label?: string;                                  // default "Copy"
  size?: 24 | 32 | 40 | 48;                        // default 32
  variant?: ButtonProps["variant"];                // default "ghost"
  onCopy?: (result: "copied" | "failed") => void;
  className?: string;
}
```

Renders `<Button type="button" variant size className onClick>` with `<IconCopy size={16} aria-hidden="true" />` then `<span>{label}</span>`. `onClick`: `const clip = navigator.clipboard; if (!clip?.writeText) { onCopy?.("failed"); return; } clip.writeText(value).then(() => onCopy?.("copied"), () => onCopy?.("failed"));`. No tokens, no CSS module (every visual is `Button`'s — say so in a comment, as `Pagination` does). Tests: visible label (default and custom); icon `aria-hidden`; `writeText` called with `value` then `onCopy("copied")` (stub `navigator.clipboard` with `Object.defineProperty`); rejected → `"failed"`; absent clipboard → `"failed"`; label unchanged after copying; no `role`/`aria-live`. Stories: `Default`, `Neutral`, `Size40`. Axe: one case. Add `"CopyButton"` and `"Skeleton"` to `TAKES_NO_CHILDREN` in `scripts/seed-patterns.test.ts` (it lists the components whose manifest has no `children`).

### Task 5: Patterns, counts, prose, changeset *(agent)*

- Patterns in `packages/react/patterns/`: `page-banner.json` (`Banner` with `variant` param over the four, `title`, body, `action` slot holding a ghost `Button` "Refresh"), `form-feedback.json` (`InlineAlert variant="danger"` with title, body holding message text and a `CopyButton` with `value: {content:identifier}`), `loading-table.json` (`Table` > `TableHead` row of three `TableHeaderCell`s + `TableBody` with `aria-busy: "true"` and one `TableRow` of three `TableCell`s each holding `Skeleton`), `copyable-id.json` (`DescriptionList layout="inline"` > `DescriptionItem term="{content:term}"` body: `{content:value}` text and a `CopyButton`). Check slot names against each component's `slots.json` (`Banner`/`InlineAlert` need one declaring `title`, `body`, `action`; write it). Add the four ids to `seed-patterns.test.ts` and `emit-patterns.test.ts` ("twenty").
- Counts: 37 → 41 in `README.md` (and the four names appended to its list), `packages/react/README.md`, `packages/react/llms.txt`, `packages/mcp/README.md`; 16 → 20 in `packages/react/llms.txt`, `packages/mcp/README.md`, `packages/mcp/llms.txt`. `node tools/check-docs-drift.mjs` after `pnpm build`.
- `packages/react/llms.txt`: a `## Feedback (4)` section before the Toast family: one line per component, each opening with "not a live region".
- `.changeset/feedback-components.md`, `minor` for tokens and react.
- `pnpm build`; `git add` regenerated `packages/react/docs/*.md` and `apps/storybook/src/patterns/Presets.stories.tsx`. Commit.

### Task 6: Gates, browser, spec, PR *(main session)*

- [ ] Five gates, then `pnpm test:e2e`.
- [ ] In a browser: each component in light and ember; `Skeleton` under `reducedMotion: "reduce"` — `animation-duration` 0.01ms and `animation-name` none; add that assertion to a new `apps/storybook/vr/skeleton.interaction.spec.ts`.
- [ ] Spec Verification and Consequences; status Implemented. Commit.
- [ ] Re-check D86 free; push; PR; auto-merge armed and read back; stop for review.
