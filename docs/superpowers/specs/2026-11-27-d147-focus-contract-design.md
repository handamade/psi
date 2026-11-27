# One focus contract: when Psi moves focus, and how a consumer takes part (D147)

Date: 2026-11-27. Status: **Designed**, on branch `d147-focus-contract`.

Provenance: the 0.37 adoption gap analysis, row A1. A consumer that manages
focus itself had to move focus inside React's commit, before `ToastRegion`'s
`MutationObserver` ran. A later toast then still stole focus, through the
defect described below in §4. That consumer has put its adoption of Psi's
hand-backs on hold until it can see where each one sends focus and how to take
part.

D146 is #206. D147 had no `## Decisions` entry in any spec, no branch and no
changeset on `origin` on 2026-11-27. **Check it again when the PR opens.**

## What's there today

Read on `main` at `b85411f` (0.39.0 pending). Psi calls `focus()` in eight
source files. The calls fall into three kinds.

**Hand-backs.** A container that holds focus closes or goes away, and Psi
chooses where focus lands.

| Component | Trigger | Target | Where |
| --- | --- | --- | --- |
| `Dialog` | `open` turns false; or removed while open (D136) | the opener; the platform restores it inside `close()` | `Dialog.tsx`, the `[open]` effect and the unmount `useLayoutEffect` |
| `Menu` | `open` turns false while focus is in the popover (D58, D50) | the trigger's focusable node | `useMenuKeyboard.ts:69-76` |
| `AppShell` | the sidebar closes around focus (D142) | the `aria-controls` toggle, else `main` | `AppShell.tsx:131-147` |
| `ToastRegion` | the toast holding focus is removed (D136) | the next toast's control; by pointer, the element focused before the region; else the region | `ToastRegion.tsx:155-228` |

**Rescues.** The focused part of a widget disappears or is disabled, and Psi
refocuses a neighbour inside the same widget.

| Component | Trigger | Target | Where |
| --- | --- | --- | --- |
| `Menu` | the focused item is removed while open (D131) | the item now at its index, else the menu | `useMenuKeyboard.ts:78-114` |
| `Pagination` | the pressed arrow becomes disabled | the current page | `Pagination.tsx:185-192` |
| `CursorPagination` | the pressed arrow becomes disabled | the other arrow | `CursorPagination.tsx:60-71` |

**A widget's own focus.** `Combobox` keeps focus in its input, `Tabs` moves
between tabs, and `Menu` and `Dialog` focus their first item or
`initialFocus` on open. These are not part of this decision.

Every hand-back and rescue already guards on roughly the same condition: act
only when focus would otherwise fall to `<body>`. Each writes the guard in
its own words. `Menu`'s close guard reads "focus is still inside the
popover". The rescues and `ToastRegion` read "the active element is `<body>`
or null". `AppShell` reads "the sidebar contains the active element". No
document states the rule. No component lets a consumer see the hand-back,
decline it or choose another target.

### The defect (P250)

`ToastRegion`'s observer, `ToastRegion.tsx:197-216`:

```ts
if (!held || held.isConnected) return;
const active = document.activeElement;
if (active && active !== document.body && active !== document.documentElement) return; // :202
const lost = held;
held = null;                                                                           // :204
```

When the focused toast is removed and focus is already somewhere else, the
early return at `:202` leaves `held` and `cameFrom` set. That happens when a
consumer moved focus during the commit, as in the case above. `held` is now a
disconnected node. The next mutation in the region, a new `Toast` or
`Announcement` while focus sits on `<body>`, passes both guards. It then moves
focus to the newest toast's control, else to the stale `cameFrom`, else to the
region. Focus is stolen from a page the user had moved on from.

## Decisions

### 1. One rule, one predicate

**Psi moves focus only when focus is lost.** Focus is lost when the element
that holds it is leaving and focus has gone nowhere else. "Leaving" means
removed, hidden or disabled. "Nowhere else" means the active element is:

- null, `<body>` or `<html>`; or
- the departing element or one of its descendants; or
- disconnected.

If focus is anywhere else, the user or the consumer put it there, and Psi
leaves it.

The rule lives in one internal module, `packages/react/src/internal/focus/`:

```ts
/** D147: true when focus has nowhere to be but on `departing` or nowhere at all. */
export function isFocusLost(departing: Element | null, doc?: Document): boolean;
```

`doc` defaults to `departing?.ownerDocument ?? document`. All seven moves
call it in place of their own guards. Behaviour is unchanged for every input
the current guards accept. `Menu`'s close guard, "the popover contains the
active element", is the second bullet. `ToastRegion` and the two rescues read
the first and third. `AppShell` reads the second.

### 2. `onFocusReturn` on the four hand-backs

`Dialog`, `Menu`, `AppShell` and `ToastRegion` take one new optional prop.
`ToastProvider` spreads its rest props onto `ToastRegion`, so it takes the
prop too.

```ts
export interface FocusReturnEvent<R extends string = string> {
  /** Where Psi is about to put focus; null when Psi has no target and will focus nothing. */
  readonly target: HTMLElement | null;
  /** Why focus is being handed back. */
  readonly reason: R;
  /** Psi will not move focus. */
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}

onFocusReturn?: (event: FocusReturnEvent<Reason>) => void;
```

| Component | `Reason` | `target` |
| --- | --- | --- |
| `Dialog` | `"close" \| "unmount"` | the opener, already focused by the platform (see below) |
| `Menu` | `"close"` | the trigger's focusable node |
| `AppShell` | `"sidebar-close"` | the toggle, else `main` |
| `ToastRegion` | `"toast-removed"` | the next control, else the element focused before, else the region |

**When it fires.** It fires at the moment of the hand-back, and only when
`isFocusLost` holds. When the rule says focus is not lost, Psi does nothing,
so there is no event.

**How a consumer takes part.**

- **Take over:** call `.focus()` on your own element inside the handler.
  After the handler returns, Psi checks `isFocusLost` again. Focus is now
  elsewhere, so Psi does not override it. A take-over needs no
  `preventDefault()`.
- **Opt out:** call `preventDefault()` and focus nothing. Psi leaves focus
  where it is.
- **Accept:** do nothing, or only read `target` and `reason`, for logging or
  analytics.

The handler runs synchronously, inside the hand-back. That is the moment
WEB-2140 had to find by hand.

**`Dialog` is the one exception, because of the platform.** `close()` restores
focus to the dialog's "previously focused element", and nothing can stop that
step. A handler run before `close()` cannot focus outside a modal dialog that
is still open, because everything outside it is inert. So `Dialog` checks
`isFocusLost(dialog)` before `close()`, which is true whenever focus was
inside the dialog. When it holds, `Dialog` fires `onFocusReturn` *after*
`close()`. `target` is then the element that holds
focus, which is the opener, or null if the platform left focus on `<body>`.
Focusing elsewhere in the handler still takes over. `preventDefault()` is
accepted and has no effect, because the move has already happened. The JSDoc
and the focus guide both say so. On `"unmount"`, the handler runs from the
layout cleanup that D136 added, after its `close()`. The latest
`onFocusReturn` is read through a ref, so a re-render between open and close
never calls a stale handler.

`Menu`'s and `AppShell`'s handlers run from effects that run while the
component is unmounting or re-rendering. They read the latest prop through a
ref for the same reason.

**Not on the rescues.** The `Menu` item removal and the two pagination
rescues move focus inside Psi's own widget, to keep its keyboard reachable.
A hook there would hand a consumer the inside of a Psi widget. These moves
follow §1's rule and take no prop.

### 3. One shared helper for the hand-backs

```ts
/** D147: hand focus back when it is lost, letting the consumer see, decline or redirect it. */
export function handBackFocus<R extends string>(options: {
  departing: Element | null;
  target: HTMLElement | null;
  reason: R;
  onFocusReturn?: (event: FocusReturnEvent<R>) => void;
  fallback?: HTMLElement | null; // focused when target refuses focus (ToastRegion's region)
}): void;
```

The order is:

1. If `!isFocusLost(departing)`, return.
2. Call `onFocusReturn`.
3. If the event was prevented, or `!isFocusLost(departing)` (the handler took
   over), return.
4. Focus `target`, and if it did not take focus, focus `fallback`.

`ToastRegion` keeps its own choice of `target`, which has an ordered list of
candidates. It passes the first candidate that accepts focus, which it
probes before calling the helper, and passes the region as `fallback`.
`Dialog` does not use the helper's focus step: it builds the event itself
after `close()`, using the same `FocusReturnEvent` type.

### 4. The fix for P250

In `ToastRegion`'s observer, the early return at `:202` becomes "focus is
not lost". Before it returns, it clears `held` and `cameFrom`. Under §1 that
branch means someone else placed focus, so the region forgets the departed
node. A later toast then finds `held === null` and does nothing.

### 5. Docs

- **`packages/docs/guides/focus.mdx`**, in `GUIDE_ORDER` after `ui-sdk`. It
  holds the rule, the hand-back and rescue tables from "What's there today"
  with a reason column, the `onFocusReturn` contract, `Dialog`'s exception,
  and an example: a list whose row delete focuses the next row through
  `Dialog`'s `onFocusReturn`. The MCP indexes it as `guide:focus` with no
  change to the MCP.
- **The four components' JSDoc** states the hand-back in one line, with its
  reasons, and points to the guide. The manifest and the MCP's `get` pick
  that up from the props.
- **`packages/react/llms.txt`**: one line under focus, naming
  `onFocusReturn` and the guide.
- **Changeset**: minor. It adds `onFocusReturn` on four components and
  `FocusReturnEvent` as an exported type, and fixes P250. No existing
  behaviour changes for a consumer that passes no handler.

### 6. Testing

Every new test is written to fail first.

- **`internal/focus/isFocusLost.test.ts`**: each case of §1 (null, `<body>`,
  `<html>`, the departing element, a descendant, a disconnected element),
  and focus on an unrelated element returning false.
- **`internal/focus/handBackFocus.test.ts`**:
  - the handler is called with `target` and `reason`;
  - prevented means no move;
  - focusing in the handler wins;
  - focus not lost means no handler call and no move;
  - a target that refuses focus falls back.
- **Per component**, in the existing test files' style. Each test checks:
  - the handler is called once, with the right `reason` and `target`;
  - a take-over in the handler sticks;
  - `preventDefault()` keeps focus, except on `Dialog`, where the test
    asserts the documented no-op;
  - no call when the user had already moved focus.

  The cases:
  - `Dialog`: controlled close (`"close"`) and removal while open
    (`"unmount"`).
  - `Menu`: Escape and item selection. A light dismiss to a text field: no
    call.
  - `AppShell`: both `sidebarMotion` modes.
  - `ToastRegion`: dismissal by keyboard and by pointer.
- **The P250 regression**, `ToastRegion`:
  1. Focus a toast's dismiss button.
  2. In the same act, remove that toast and focus a button outside the
     region, as a consumer's commit would.
  3. Move focus to `<body>`.
  4. Raise a new toast.
  5. Focus stays on `<body>`. Today it jumps to the new toast.
- **The existing focus tests stay green with no edits.** They cover D131
  (`MenuRemoval.test.tsx`), D136 (`Dialog` `RemovedWhileOpen`, `Toast`
  `DismissFocused`), D142 (the `AppShell` sidebar tests) and the pagination
  tests. They are the proof that §1 preserves behaviour.
- **`vr`**: there is no visual change, so 0 differing pixels.

## Out of scope, follow-ups

- **The focus a widget manages for itself**: `Combobox`'s input, `Tabs`'
  roving focus, `Menu` and `Dialog` on open. None hands focus *back*.
- **A hook on the rescues.** Reopen it if a consumer shows a case Psi's
  choice cannot serve.
- **`AppShell`'s removed-content case**, where `sidebar` turns null around
  focus. D142 leaves it out, because the focused node is gone before any
  effect runs. D147 does not change that. The guide names it.
- **`Tooltip`, `Select`, `Combobox`'s popup**: they do not take focus away
  from their control, so they hand nothing back.

## Verification

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
```

`vr` runs in CI only and should report 0 differing pixels.
`check-docs-drift` will catch the guide count. The docs site and the MCP
gain one guide each.
