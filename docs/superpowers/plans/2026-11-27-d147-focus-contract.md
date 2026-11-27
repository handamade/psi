# One focus contract (D147) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One written focus rule behind every focus hand-back and rescue in
Psi, an `onFocusReturn` hook on `Dialog`, `Menu`, `AppShell` and
`ToastRegion`, and the fix for `ToastRegion`'s stale focus state.

**Architecture:** A new internal module, `packages/react/src/internal/focus/`,
holds four things:

- `isFocusLost`, the rule;
- `createFocusReturnEvent`;
- `handBackFocus`, the shared hand-back;
- `useLatestRef`.

The three rescues swap their hand-written guards for `isFocusLost`, and
behaviour does not change. The four hand-backs route through the module and
fire `onFocusReturn`. `Dialog` fires it after the platform's own restore in
`close()`.

**Tech Stack:** React 19, TypeScript, Vitest + Testing Library on jsdom
(`packages/react/vitest.setup.ts` polyfills `<dialog>` and Popover), MDX
guides in `packages/docs`, changesets.

**Spec:** `docs/superpowers/specs/2026-11-27-d147-focus-contract-design.md`.
Read its *Decisions* and its *Amendments, 2026-11-27 (planning)*. The
amendments win where they differ from §1 to §3.

## Global Constraints

- **Node 24.** Run `node -v` before the first pnpm command. If it is not 24,
  run `nvm use` in the repo root.
- **Behaviour is unchanged for a consumer that passes no handler.** Every
  existing focus test stays green **with no edits**:
  - `Menu/MenuRemoval.test.tsx`, `Menu/useMenuKeyboard.test.tsx`;
  - `Toast/ToastFocus.test.tsx`, `Dialog/Dialog.test.tsx`;
  - `AppShell/AppShell.test.tsx`;
  - `Pagination/Pagination.test.tsx`, `CursorPagination/CursorPagination.test.tsx`.

  If one fails, the change is wrong, not the test.
- **The rule (spec §1, amended).** Psi moves focus only when focus is lost.
  - `isFocusLost(departing, { includeNowhere })` is true when the active
    element is `departing` or inside it.
  - With `includeNowhere` (default `true`), it is also true when the active
    element is null, `<body>`, `<html>` or disconnected.
  - `Menu`'s close, `AppShell`'s sidebar and `Dialog` pass
    `includeNowhere: false`. The rescues and `ToastRegion` use the default.
- **Reasons, exact strings:**
  - `Dialog`: `"close" | "unmount"`
  - `Menu`: `"close"`
  - `AppShell`: `"sidebar-close"`
  - `ToastRegion`: `"toast-removed"`
- **Exported types:** `FocusReturnEvent`, `DialogFocusReturnReason`,
  `MenuFocusReturnReason`, `AppShellFocusReturnReason` and
  `ToastFocusReturnReason`.
- **No hook on the rescues** (`Menu` item removal, `Pagination`,
  `CursorPagination`).
- **No visual change.** `vr` must report 0 differing pixels. Never run
  `pnpm vr` locally, and never commit a `*-darwin.png`.
- **Never hardcode colours.** This plan adds no CSS.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Five gates** (Task 8), in this order:

  ```bash
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
  ```

Run a single package's tests with
`pnpm --filter @handamade/psi-react exec vitest run <path>`, from the repo
root.

---

### Task 1: The focus module

**Files:**
- Create: `packages/react/src/internal/focus/focusReturn.ts`
- Test: `packages/react/src/internal/focus/focusReturn.test.tsx`
- Modify: `packages/react/src/index.ts`, beside the `Dialog` exports at
  lines 36-37

**Interfaces:**
- Produces (every later task imports these from
  `../internal/focus/focusReturn.js`):
  - `interface FocusReturnEvent<R extends string = string> { readonly target: HTMLElement | null; readonly reason: R; preventDefault(): void; readonly defaultPrevented: boolean }`
  - `function isFocusLost(departing: Element | null, options?: { includeNowhere?: boolean }): boolean`
  - `function createFocusReturnEvent<R extends string>(target: HTMLElement | null, reason: R): FocusReturnEvent<R>`
  - `function handBackFocus<R extends string>(options: HandBackOptions<R>): HTMLElement | null`
  - `function useLatestRef<T>(value: T): RefObject<T>`

- [ ] **Step 1: Write the failing tests**

```tsx
// packages/react/src/internal/focus/focusReturn.test.tsx
// D147: the one focus rule and the shared hand-back.
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createFocusReturnEvent, handBackFocus, isFocusLost, useLatestRef } from "./focusReturn.js";

function setup() {
  document.body.innerHTML = `
    <div id="box"><button id="inner">Inner</button></div>
    <button id="outside">Outside</button>
    <button id="target">Target</button>
    <button id="fallback">Fallback</button>
    <button id="disabled" disabled>Disabled</button>`;
  const $ = (id: string) => document.getElementById(id) as HTMLElement;
  return { box: $("box"), inner: $("inner"), outside: $("outside"), target: $("target"), fallback: $("fallback"), disabled: $("disabled") };
}

describe("isFocusLost (D147)", () => {
  it("is true when focus is on the departing element or inside it", () => {
    const { box, inner } = setup();
    inner.focus();
    expect(isFocusLost(box)).toBe(true);
    expect(isFocusLost(inner)).toBe(true);
  });

  it("is true when focus is on <body>, by default", () => {
    const { box } = setup();
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);
    expect(isFocusLost(box)).toBe(true);
    expect(isFocusLost(null)).toBe(true);
  });

  it("is false on <body> with includeNowhere: false", () => {
    const { box } = setup();
    (document.activeElement as HTMLElement | null)?.blur();
    expect(isFocusLost(box, { includeNowhere: false })).toBe(false);
  });

  it("is still true inside the element with includeNowhere: false", () => {
    const { box, inner } = setup();
    inner.focus();
    expect(isFocusLost(box, { includeNowhere: false })).toBe(true);
  });

  it("is false when focus is on an unrelated element", () => {
    const { box, outside } = setup();
    outside.focus();
    expect(isFocusLost(box)).toBe(false);
    expect(isFocusLost(null)).toBe(false);
  });
});

describe("createFocusReturnEvent (D147)", () => {
  it("carries target and reason, and records preventDefault", () => {
    const { target } = setup();
    const event = createFocusReturnEvent(target, "close");
    expect(event.target).toBe(target);
    expect(event.reason).toBe("close");
    expect(event.defaultPrevented).toBe(false);
    event.preventDefault();
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("handBackFocus (D147)", () => {
  it("calls the handler with the first non-null candidate and the reason, then focuses it", () => {
    const { box, inner, target } = setup();
    inner.focus();
    const onFocusReturn = vi.fn();
    const focused = handBackFocus({ departing: box, candidates: [null, target], reason: "close", onFocusReturn });
    expect(onFocusReturn).toHaveBeenCalledTimes(1);
    expect(onFocusReturn.mock.calls[0][0]).toMatchObject({ target, reason: "close" });
    expect(focused).toBe(target);
    expect(target).toHaveFocus();
  });

  it("moves nothing when the handler prevents it", () => {
    const { box, inner, target } = setup();
    inner.focus();
    const focused = handBackFocus({
      departing: box,
      candidates: [target],
      reason: "close",
      onFocusReturn: (event) => event.preventDefault(),
    });
    expect(focused).toBeNull();
    expect(inner).toHaveFocus();
  });

  it("lets a handler that focuses its own element win", () => {
    const { box, inner, target, outside } = setup();
    inner.focus();
    const focused = handBackFocus({
      departing: box,
      candidates: [target],
      reason: "close",
      onFocusReturn: () => outside.focus(),
    });
    expect(focused).toBeNull();
    expect(outside).toHaveFocus();
  });

  it("does nothing, and calls nothing, when focus is not lost", () => {
    const { box, outside, target } = setup();
    outside.focus();
    const onFocusReturn = vi.fn();
    expect(handBackFocus({ departing: box, candidates: [target], reason: "close", onFocusReturn })).toBeNull();
    expect(onFocusReturn).not.toHaveBeenCalled();
    expect(outside).toHaveFocus();
  });

  it("falls through to the next candidate when one refuses focus", () => {
    const { box, inner, disabled, fallback } = setup();
    inner.focus();
    const focused = handBackFocus({ departing: box, candidates: [disabled, fallback], reason: "close" });
    expect(focused).toBe(fallback);
    expect(fallback).toHaveFocus();
  });

  it("honours includeNowhere: false", () => {
    const { box, target } = setup();
    (document.activeElement as HTMLElement | null)?.blur();
    const onFocusReturn = vi.fn();
    handBackFocus({ departing: box, includeNowhere: false, candidates: [target], reason: "close", onFocusReturn });
    expect(onFocusReturn).not.toHaveBeenCalled();
    expect(document.body).toHaveFocus();
  });
});

describe("useLatestRef (D147)", () => {
  it("holds the value of the latest render", () => {
    let seen: { current: string } | null = null;
    function Probe({ value }: { value: string }) {
      seen = useLatestRef(value);
      return null;
    }
    const { rerender } = render(<Probe value="a" />);
    rerender(<Probe value="b" />);
    expect(seen!.current).toBe("b");
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/internal/focus/focusReturn.test.tsx`
Expected: FAIL, because the module `./focusReturn.js` cannot be resolved.

- [ ] **Step 3: Write the module**

```ts
// packages/react/src/internal/focus/focusReturn.ts
import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

/** D147: what a hand-back tells the consumer, through `onFocusReturn`.
 * Focusing your own element inside the handler takes over; `preventDefault()`
 * alone leaves focus where it is. See the Focus guide. */
export interface FocusReturnEvent<R extends string = string> {
  /** Where Psi is about to put focus; null when Psi has no target. On Dialog,
   * the element the platform has already focused. */
  readonly target: HTMLElement | null;
  /** Why focus is being handed back. */
  readonly reason: R;
  /** Psi will not move focus. A no-op on Dialog, whose move the platform has
   * already made. */
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}

/** D147, the one rule: Psi moves focus only when focus is lost. True when the
 * active element is `departing` or inside it; with `includeNowhere` (the
 * default) also when it is null, <body>, <html> or disconnected. A container
 * that is still in the document passes `includeNowhere: false`, so that focus
 * a click put on <body> is not pulled back. */
export function isFocusLost(
  departing: Element | null,
  { includeNowhere = true }: { includeNowhere?: boolean } = {},
): boolean {
  const doc = departing?.ownerDocument ?? document;
  const active = doc.activeElement;
  const nowhere = !active || active === doc.body || active === doc.documentElement || !active.isConnected;
  if (nowhere) return includeNowhere;
  return departing != null && departing.contains(active);
}

export function createFocusReturnEvent<R extends string>(
  target: HTMLElement | null,
  reason: R,
): FocusReturnEvent<R> {
  let prevented = false;
  return {
    target,
    reason,
    preventDefault() {
      prevented = true;
    },
    get defaultPrevented() {
      return prevented;
    },
  };
}

export interface HandBackOptions<R extends string> {
  /** The element that held focus and is leaving (removed, hidden or disabled). */
  departing: Element | null;
  /** @default true. See isFocusLost. */
  includeNowhere?: boolean;
  /** Where focus may go, best first. The first non-null one is the event's target. */
  candidates: ReadonlyArray<HTMLElement | null | undefined>;
  reason: R;
  onFocusReturn?: (event: FocusReturnEvent<R>) => void;
}

/** D147: hand focus back when it is lost, letting the consumer see, decline or
 * redirect the move. Returns the candidate that took focus, or null. */
export function handBackFocus<R extends string>({
  departing,
  includeNowhere = true,
  candidates,
  reason,
  onFocusReturn,
}: HandBackOptions<R>): HTMLElement | null {
  if (!isFocusLost(departing, { includeNowhere })) return null;
  const list = candidates.filter((el): el is HTMLElement => el != null);
  const event = createFocusReturnEvent(list[0] ?? null, reason);
  onFocusReturn?.(event);
  if (event.defaultPrevented || !isFocusLost(departing, { includeNowhere })) return null;
  const doc = departing?.ownerDocument ?? document;
  for (const el of list) {
    el.focus();
    if (doc.activeElement === el) return el;
  }
  return null;
}

/** D147: a ref that always holds the latest render's value, for a handler read
 * from an effect or an observer that outlives the render that set it. */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
```

- [ ] **Step 4: Export the event type.** In `packages/react/src/index.ts`,
  after line 37 (`export type { DialogProps } …`), add:

```ts
export type { FocusReturnEvent } from "./internal/focus/focusReturn.js";
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/internal/focus/focusReturn.test.tsx`
Expected: PASS, 13 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/internal/focus packages/react/src/index.ts
git commit -m "feat(react): the focus rule and the shared hand-back, internal (D147)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The rescues follow the rule

There is no new behaviour in this task. Three hand-written guards become
`isFocusLost`, and their existing tests are the proof.

**Files:**
- Modify: `packages/react/src/Menu/useMenuKeyboard.ts`, the D131 observer (around lines 93-100)
- Modify: `packages/react/src/Pagination/Pagination.tsx:185-192`
- Modify: `packages/react/src/CursorPagination/CursorPagination.tsx:60-71`

**Interfaces:**
- Consumes: `isFocusLost` from Task 1.

- [ ] **Step 1: Run the existing tests as a baseline**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/Menu src/Pagination src/CursorPagination`
Expected: PASS. Write down the test count.

- [ ] **Step 2: Menu's item rescue.** In `useMenuKeyboard.ts`, add the import:

```ts
import { isFocusLost } from "../internal/focus/focusReturn.js";
```

In the D131 `MutationObserver` callback, replace:

```ts
      const active = document.activeElement;
      if (active && active !== document.body && !root.contains(active)) return;
```

with:

```ts
      // D147: the one rule. Focus the user moved out of the menu is left alone.
      if (!isFocusLost(root)) return;
```

- [ ] **Step 3: Pagination.** In `Pagination.tsx`, import `isFocusLost` the
  same way (`../internal/focus/focusReturn.js`), and in the effect at
  185-192 replace:

```ts
    const active = document.activeElement;
    if (active !== arrow && active !== document.body && active !== null) return;
```

with:

```ts
    // D147: the one rule — focus still on the disabled arrow, or fallen to nowhere.
    if (!isFocusLost(arrow)) return;
```

- [ ] **Step 4: CursorPagination.** Same import. At 68-69 replace:

```ts
    const active = document.activeElement;
    if (active !== from && active !== document.body && active !== null) return;
```

with:

```ts
    // D147: the one rule — focus still on the disabled arrow, or fallen to nowhere.
    if (!isFocusLost(from)) return;
```

- [ ] **Step 5: Run the same tests again**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/Menu src/Pagination src/CursorPagination`
Expected: PASS, with the same count as Step 1 and no test file edited.

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/Menu/useMenuKeyboard.ts packages/react/src/Pagination/Pagination.tsx packages/react/src/CursorPagination/CursorPagination.tsx
git commit -m "refactor(react): the focus rescues read the one focus rule (D147)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `ToastRegion`: `onFocusReturn`, and the stale-focus fix

**Files:**
- Modify: `packages/react/src/Toast/ToastRegion.tsx`: the props at
  lines 12-23, the component signature, the JSDoc above it, and the
  observer at lines 155-228
- Modify: `packages/react/src/Toast/ToastProvider.tsx`: the
  `ToastProviderProps` type (lines 20-40)
- Modify: `packages/react/src/index.ts`, line 102
- Test: `packages/react/src/Toast/ToastFocusReturn.test.tsx` (new)

**Interfaces:**
- Consumes: `isFocusLost`, `handBackFocus`, `useLatestRef` and `FocusReturnEvent`
  from Task 1.
- Produces: `export type ToastFocusReturnReason = "toast-removed";` and
  `onFocusReturn?: (event: FocusReturnEvent<ToastFocusReturnReason>) => void`
  on `ToastRegionProps`.

- [ ] **Step 1: Write the failing tests**

```tsx
// packages/react/src/Toast/ToastFocusReturn.test.tsx
// D147: ToastRegion's hand-back is seen, declined or redirected through
// onFocusReturn, and a removal the consumer already handled leaves no stale
// state behind. { hidden: true } is not needed: no role queries.
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Toast } from "./Toast.js";
import { ToastRegion } from "./ToastRegion.js";
import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";

function Stack({ ids, onFocusReturn }: { ids: string[]; onFocusReturn?: (e: FocusReturnEvent<"toast-removed">) => void }) {
  return (
    <>
      <button>Opener</button>
      <input aria-label="Elsewhere" />
      <ToastRegion onFocusReturn={onFocusReturn}>
        {ids.map((id) => (
          <Toast key={id} onDismiss={() => {}}>
            {id}
          </Toast>
        ))}
      </ToastRegion>
    </>
  );
}

const dismissOf = (id: string) =>
  screen.getByText(id).closest("[data-psi-toast]")!.querySelector("[data-psi-toast-dismiss]") as HTMLElement;
const opener = () => screen.getByText("Opener");
const elsewhere = () => screen.getByLabelText("Elsewhere");

function enterFromOpener(target: HTMLElement) {
  opener().focus();
  target.focus();
}

describe("ToastRegion: onFocusReturn (D147)", () => {
  it("reports the hand-back with its target and reason, then makes it", async () => {
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Stack ids={["A", "B"]} onFocusReturn={onFocusReturn} />);
    enterFromOpener(dismissOf("A"));
    rerender(<Stack ids={["B"]} onFocusReturn={onFocusReturn} />);
    await waitFor(() => expect(dismissOf("B")).toHaveFocus());
    expect(onFocusReturn).toHaveBeenCalledTimes(1);
    expect(onFocusReturn.mock.calls[0][0]).toMatchObject({ reason: "toast-removed", target: dismissOf("B") });
  });

  it("lets the handler take focus elsewhere", async () => {
    const { rerender } = render(<Stack ids={["A", "B"]} onFocusReturn={() => elsewhere().focus()} />);
    enterFromOpener(dismissOf("A"));
    rerender(<Stack ids={["B"]} onFocusReturn={() => elsewhere().focus()} />);
    await waitFor(() => expect(elsewhere()).toHaveFocus());
  });

  it("moves nothing when the handler prevents it", async () => {
    const prevent = (e: FocusReturnEvent<"toast-removed">) => e.preventDefault();
    const { rerender } = render(<Stack ids={["A", "B"]} onFocusReturn={prevent} />);
    enterFromOpener(dismissOf("A"));
    rerender(<Stack ids={["B"]} onFocusReturn={prevent} />);
    await Promise.resolve();
    await Promise.resolve();
    expect(dismissOf("B")).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it("is not called when focus had already gone elsewhere", async () => {
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Stack ids={["A", "B"]} onFocusReturn={onFocusReturn} />);
    enterFromOpener(dismissOf("A"));
    elsewhere().focus();
    rerender(<Stack ids={["B"]} onFocusReturn={onFocusReturn} />);
    await Promise.resolve();
    expect(onFocusReturn).not.toHaveBeenCalled();
    expect(elsewhere()).toHaveFocus();
  });
});

describe("ToastRegion: a removal the consumer handled leaves no stale state", () => {
  it("does not move focus to a later toast", async () => {
    const { rerender } = render(<Stack ids={["A"]} />);
    enterFromOpener(dismissOf("A"));
    // The consumer's commit: the toast goes and focus moves, before the
    // region's observer runs (no await between the two lines).
    rerender(<Stack ids={[]} />);
    elsewhere().focus();
    await Promise.resolve();
    await Promise.resolve();
    expect(elsewhere()).toHaveFocus();
    // Later, focus falls to the page and a new toast arrives.
    elsewhere().blur();
    rerender(<Stack ids={["B"]} />);
    await Promise.resolve();
    await Promise.resolve();
    expect(document.body).toHaveFocus();
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/Toast/ToastFocusReturn.test.tsx`
Expected: FAIL.
- The `onFocusReturn` tests fail on the prop's type, or because no handler
  is called.
- The stale-focus test fails because focus moves to B's dismiss button. That is the
  defect.

If the stale-focus test passes before the fix, stop and report it. The test then
does not reproduce the defect in jsdom, and it needs the spec's attention.

- [ ] **Step 3: The props.** In `ToastRegion.tsx`, after the `ToastPlacement`
  type, add:

```ts
/** Why ToastRegion hands focus back (D147). */
export type ToastFocusReturnReason = "toast-removed";
```

Add this to `ToastRegionProps`, after `placement`:

```ts
  /** Called when the toast that held focus is removed and Psi is about to hand
   * focus on (D147): `event.target` is where it is going. Focus your own
   * element in the handler to take over, or call `preventDefault()` to leave
   * focus where it is. Not called when focus had already gone elsewhere. See
   * the Focus guide. */
  onFocusReturn?: (event: FocusReturnEvent<ToastFocusReturnReason>) => void;
```

with the imports:

```ts
import { handBackFocus, isFocusLost, useLatestRef } from "../internal/focus/focusReturn.js";
import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";
```

Add `onFocusReturn,` to the destructured props, before `className`, so it
does not reach `...rest` and the DOM. Inside the component, add
`const onFocusReturnRef = useLatestRef(onFocusReturn);`, declared before the
D136 effect.

- [ ] **Step 4: The observer.** Replace the `MutationObserver` callback body
  (lines 197-216) with:

```ts
    const observer = new MutationObserver(() => {
      const before = snapshot;
      snapshot = toastsIn(root);
      if (!held || held.isConnected) return;
      const lost = held;
      held = null;
      // D147, stale focus: focus went somewhere else first — a consumer moved it
      // during its own commit. Forget the region's state, so a later toast
      // finds nothing to hand back and cannot steal focus.
      if (!isFocusLost(lost)) {
        cameFrom = null;
        return;
      }
      const back = cameFrom?.isConnected ? cameFrom : null;
      const next = byPointer && back ? null : nextControl(before, snapshot, lost);
      const focused = handBackFocus({
        departing: lost,
        candidates: [next, back, root],
        reason: "toast-removed",
        onFocusReturn: onFocusReturnRef.current,
      });
      if (focused === back) cameFrom = null;
    });
```

In the component's JSDoc paragraph that begins "**A toast that held focus
hands it on when it goes (D136).**", append: "`onFocusReturn` sees the move,
and can take it over or decline it (D147)."

- [ ] **Step 5: `ToastProvider` passes the prop through.** `ToastProvider`
  spreads its rest props onto `ToastRegion`, so the prop only needs a type.
  In `ToastProvider.tsx`, add `ToastFocusReturnReason` to the existing type
  import from `./ToastRegion.js`, and add
  `import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";`.
  Then add to `ToastProviderProps`:

```ts
  /** Forwarded to ToastRegion: called when the toast that held focus is
   * removed and Psi is about to hand focus on (D147). See the Focus guide. */
  onFocusReturn?: (event: FocusReturnEvent<ToastFocusReturnReason>) => void;
```

- [ ] **Step 6: Export the reason.** In `index.ts`, line 102 becomes:

```ts
export type { ToastRegionProps, ToastPlacement, ToastFocusReturnReason } from "./Toast/ToastRegion.js";
```

- [ ] **Step 7: Run the new and existing Toast tests**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/Toast`
Expected: PASS. `ToastFocus.test.tsx` is unchanged and green.

- [ ] **Step 8: Commit**

```bash
git add packages/react/src/Toast packages/react/src/index.ts
git commit -m "feat(react): ToastRegion reports its focus hand-back, and forgets a removal focus already left (D147)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `Menu`: `onFocusReturn`

**Files:**
- Modify: `packages/react/src/Menu/Menu.tsx`: the types near line 21, the
  `MenuProps`, the signature at line 96, and the `useMenuKeyboard` call at
  lines 138-145
- Modify: `packages/react/src/Menu/useMenuKeyboard.ts`: `Options`
  (lines 7-16) and the open effect's cleanup (lines 69-76)
- Modify: `packages/react/src/index.ts`, line 73
- Test: `packages/react/src/Menu/MenuFocusReturn.test.tsx` (new)

**Interfaces:**
- Consumes: `handBackFocus`, `useLatestRef` and `FocusReturnEvent` from Task 1.
- Produces: `export type MenuFocusReturnReason = "close";` and
  `onFocusReturn?: (event: FocusReturnEvent<MenuFocusReturnReason>) => void`
  on `MenuProps`.

- [ ] **Step 1: Write the failing tests**

```tsx
// packages/react/src/Menu/MenuFocusReturn.test.tsx
// D147: Menu's return of focus to its trigger is reported through
// onFocusReturn. { hidden: true } on role queries: jsdom hides [popover]
// content, see useMenuKeyboard.test.tsx's header.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Menu } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { Button } from "../Button/Button.js";
import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";

function Harness({ open, onFocusReturn }: { open: boolean; onFocusReturn?: (e: FocusReturnEvent<"close">) => void }) {
  return (
    <>
      <Menu open={open} onClose={() => {}} onFocusReturn={onFocusReturn} trigger={<Button size={32}>Actions</Button>} aria-label="Actions">
        <MenuItem onSelect={() => {}}>Edit</MenuItem>
      </Menu>
      <input aria-label="Search" />
    </>
  );
}

const trigger = () => screen.getByRole("button", { name: "Actions" });
const item = () => screen.getByRole("menuitem", { name: "Edit", hidden: true });
const search = () => screen.getByLabelText("Search");

describe("Menu: onFocusReturn (D147)", () => {
  it("reports the return to the trigger, then makes it", () => {
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Harness open onFocusReturn={onFocusReturn} />);
    item().focus();
    rerender(<Harness open={false} onFocusReturn={onFocusReturn} />);
    expect(onFocusReturn).toHaveBeenCalledTimes(1);
    expect(onFocusReturn.mock.calls[0][0]).toMatchObject({ reason: "close", target: trigger() });
    expect(trigger()).toHaveFocus();
  });

  it("lets the handler take focus elsewhere", () => {
    const take = () => search().focus();
    const { rerender } = render(<Harness open onFocusReturn={take} />);
    item().focus();
    rerender(<Harness open={false} onFocusReturn={take} />);
    expect(search()).toHaveFocus();
  });

  it("moves nothing when the handler prevents it", () => {
    const prevent = (e: FocusReturnEvent<"close">) => e.preventDefault();
    const { rerender } = render(<Harness open onFocusReturn={prevent} />);
    item().focus();
    rerender(<Harness open={false} onFocusReturn={prevent} />);
    expect(trigger()).not.toHaveFocus();
  });

  it("is not called after a light dismiss onto another control", () => {
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Harness open onFocusReturn={onFocusReturn} />);
    search().focus();
    rerender(<Harness open={false} onFocusReturn={onFocusReturn} />);
    expect(onFocusReturn).not.toHaveBeenCalled();
    expect(search()).toHaveFocus();
  });

  it("is not called when focus fell to the page", () => {
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Harness open onFocusReturn={onFocusReturn} />);
    (document.activeElement as HTMLElement | null)?.blur();
    rerender(<Harness open={false} onFocusReturn={onFocusReturn} />);
    expect(onFocusReturn).not.toHaveBeenCalled();
    expect(trigger()).not.toHaveFocus();
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/Menu/MenuFocusReturn.test.tsx`
Expected: FAIL, because `onFocusReturn` is not a prop and the handler is
never called.

- [ ] **Step 3: The hook.** In `useMenuKeyboard.ts`, import
  `handBackFocus` and `FocusReturnEvent` (type) from
  `../internal/focus/focusReturn.js`. Add to `Options`:

```ts
  /** D147: the consumer's onFocusReturn, kept current by Menu. */
  onFocusReturnRef?: RefObject<((event: FocusReturnEvent<"close">) => void) | undefined>;
```

Destructure `onFocusReturnRef` in the signature. Replace the open effect's
cleanup:

```ts
    return () => {
      if (popoverRef.current?.contains(document.activeElement)) focusTrigger();
    };
```

with:

```ts
    // D147: hand focus back only from a menu that still holds it, so a light
    // dismiss onto another control, or onto the page, is left alone.
    return () => {
      const triggerEl = triggerRef.current?.querySelector<HTMLElement>("button, a, [tabindex]") ?? null;
      handBackFocus({
        departing: popoverRef.current,
        includeNowhere: false,
        candidates: [triggerEl],
        reason: "close",
        onFocusReturn: onFocusReturnRef?.current,
      });
    };
```

Update the effect's dependency list: drop `focusTrigger`, and add
`triggerRef` and `onFocusReturnRef`. If `focusTrigger` is then unused
anywhere in the file, delete it. Check with `grep -n focusTrigger`.

- [ ] **Step 4: Menu.** In `Menu.tsx`, after `MenuCloseReason`, add:

```ts
/** Why Menu hands focus back (D147). */
export type MenuFocusReturnReason = "close";
```

Add to `MenuProps`, after `onClose`:

```ts
  /** Called when the menu closes while focus is inside it and Psi is about to
   * return focus to the trigger (D147): `event.target` is the trigger. Focus
   * your own element in the handler to take over, or call `preventDefault()`
   * to leave focus where it is. Not called after a light dismiss or Tab moved
   * focus elsewhere. See the Focus guide. */
  onFocusReturn?: (event: FocusReturnEvent<MenuFocusReturnReason>) => void;
```

Import `useLatestRef` and `FocusReturnEvent` (type) from
`../internal/focus/focusReturn.js`. Destructure `onFocusReturn` in the
signature, then add
`const onFocusReturnRef = useLatestRef(onFocusReturn);` before the
`useMenuKeyboard` call. Pass `onFocusReturnRef` to `useMenuKeyboard({ … })`.

- [ ] **Step 5: Export.** In `index.ts`, line 73 becomes:

```ts
export type { MenuProps, MenuPlacement, MenuContextValue, MenuCloseReason, MenuFocusReturnReason } from "./Menu/Menu.js";
```

- [ ] **Step 6: Run all the Menu tests**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/Menu`
Expected: PASS. The existing Menu test files are unchanged.

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/Menu packages/react/src/index.ts
git commit -m "feat(react): Menu reports its return of focus to the trigger (D147)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `AppShell`: `onFocusReturn`

**Files:**
- Modify: `packages/react/src/AppShell/AppShell.tsx`: the props (from
  line 5), the signature (around line 104), and the D142 layout effect
  (lines 131-147)
- Modify: `packages/react/src/index.ts`, line 26
- Test: `packages/react/src/AppShell/AppShellFocusReturn.test.tsx` (new)

**Interfaces:**
- Consumes: `isFocusLost`, `handBackFocus`, `useLatestRef` and
  `FocusReturnEvent` from Task 1.
- Produces: `export type AppShellFocusReturnReason = "sidebar-close";` and
  `onFocusReturn?: (event: FocusReturnEvent<AppShellFocusReturnReason>) => void`
  on `AppShellProps`.

- [ ] **Step 1: Write the failing tests**

```tsx
// packages/react/src/AppShell/AppShellFocusReturn.test.tsx
// D147: the sidebar's hand-back (D142) is reported through onFocusReturn.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./AppShell.js";
import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";

type Handler = (e: FocusReturnEvent<"sidebar-close">) => void;

function Toggled({ open, motion, onFocusReturn }: { open: boolean; motion: "instant" | "slide"; onFocusReturn?: Handler }) {
  return (
    <AppShell
      sidebarOpen={open}
      sidebarMotion={motion}
      onFocusReturn={onFocusReturn}
      header={<button aria-controls="sidebar">Menu</button>}
      sidebar={<nav aria-label="Main"><a href="#a">Inside</a></nav>}
    >
      <a href="#b">Outside</a>
    </AppShell>
  );
}

const toggle = () => screen.getByRole("button", { name: "Menu" });

describe("AppShell: onFocusReturn (D147)", () => {
  for (const motion of ["instant", "slide"] as const) {
    it(`${motion}: reports the hand-back to the toggle, then makes it`, () => {
      const onFocusReturn = vi.fn();
      const { rerender } = render(<Toggled open motion={motion} onFocusReturn={onFocusReturn} />);
      screen.getByText("Inside").focus();
      rerender(<Toggled open={false} motion={motion} onFocusReturn={onFocusReturn} />);
      expect(onFocusReturn).toHaveBeenCalledTimes(1);
      expect(onFocusReturn.mock.calls[0][0]).toMatchObject({ reason: "sidebar-close", target: toggle() });
      expect(toggle()).toHaveFocus();
    });

    it(`${motion}: lets the handler take focus elsewhere`, () => {
      const take: Handler = () => screen.getByText("Outside").focus();
      const { rerender } = render(<Toggled open motion={motion} onFocusReturn={take} />);
      screen.getByText("Inside").focus();
      rerender(<Toggled open={false} motion={motion} onFocusReturn={take} />);
      expect(screen.getByText("Outside")).toHaveFocus();
    });

    it(`${motion}: moves nothing when the handler prevents it`, () => {
      const prevent: Handler = (e) => e.preventDefault();
      const { rerender } = render(<Toggled open motion={motion} onFocusReturn={prevent} />);
      screen.getByText("Inside").focus();
      rerender(<Toggled open={false} motion={motion} onFocusReturn={prevent} />);
      expect(toggle()).not.toHaveFocus();
    });
  }

  it("is not called when focus is outside the sidebar", () => {
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Toggled open motion="slide" onFocusReturn={onFocusReturn} />);
    screen.getByText("Outside").focus();
    rerender(<Toggled open={false} motion="slide" onFocusReturn={onFocusReturn} />);
    expect(onFocusReturn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/AppShell/AppShellFocusReturn.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement.** In `AppShell.tsx`:
  - Add the imports:
    `import { handBackFocus, isFocusLost, useLatestRef } from "../internal/focus/focusReturn.js";`
    and `import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";`.
  - Before `AppShellProps`, add:

```ts
/** Why AppShell hands focus back (D147). */
export type AppShellFocusReturnReason = "sidebar-close";
```

  - Add to `AppShellProps`, after `sidebarId`:

```ts
  /** Called when the sidebar closes while focus is inside it and Psi is about
   * to move focus to the toggle, or to `main` (D142, D147): `event.target` is
   * where it is going. Focus your own element in the handler to take over, or
   * call `preventDefault()` to leave focus where it is. See the Focus guide. */
  onFocusReturn?: (event: FocusReturnEvent<AppShellFocusReturnReason>) => void;
```

  - Destructure `onFocusReturn` before `className`, so it never reaches
    `...rest`.
  - Add `const onFocusReturnRef = useLatestRef(onFocusReturn);` after
    `mainRef`.
  - Replace the D142 layout effect's body with:

```ts
  useLayoutEffect(() => {
    if (showSidebar) return;
    const aside = sidebarRef.current;
    const doc = aside?.ownerDocument;
    // D147: hand back only from a sidebar that still holds focus.
    if (!aside || !doc || !isFocusLost(aside, { includeNowhere: false })) return;
    const toggle = [...doc.querySelectorAll<HTMLElement>("[aria-controls]")].find(
      (el) =>
        !aside.contains(el) &&
        (el.getAttribute("aria-controls") ?? "").split(/\s+/).includes(sidebarId) &&
        !el.matches(":disabled"),
    );
    handBackFocus({
      departing: aside,
      includeNowhere: false,
      candidates: [toggle, mainRef.current],
      reason: "sidebar-close",
      onFocusReturn: onFocusReturnRef.current,
    });
  }, [showSidebar, sidebarId, onFocusReturnRef]);
```

  Keep the D142 comment above it, and append: "D147: `onFocusReturn` sees
  the move."

- [ ] **Step 4: Export.** In `index.ts`, line 26 becomes:

```ts
export type { AppShellProps, AppShellFocusReturnReason } from "./AppShell/AppShell.js";
```

- [ ] **Step 5: Run all the AppShell tests**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/AppShell`
Expected: PASS. `AppShell.test.tsx` is unchanged.

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/AppShell packages/react/src/index.ts
git commit -m "feat(react): AppShell reports the sidebar's focus hand-back (D147)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `Dialog`: `onFocusReturn`, after the platform's restore

**Files:**
- Modify: `packages/react/src/Dialog/Dialog.tsx`: the props (lines 16-52),
  the component JSDoc (lines 66-78), the `[open]` effect (lines 104-114)
  and the unmount layout effect (lines 123-128)
- Modify: `packages/react/src/index.ts`, line 37
- Test: `packages/react/src/Dialog/DialogFocusReturn.test.tsx` (new)

**Interfaces:**
- Consumes: `isFocusLost`, `createFocusReturnEvent`, `useLatestRef` and
  `FocusReturnEvent` from Task 1.
- Produces: `export type DialogFocusReturnReason = "close" | "unmount";` and
  `onFocusReturn?: (event: FocusReturnEvent<DialogFocusReturnReason>) => void`
  on `DialogProps`.

jsdom's `<dialog>` polyfill (`vitest.setup.ts`) restores no focus. Each test
spies on `close()` and lets the spy return focus to the opener, as the
platform does.

- [ ] **Step 1: Write the failing tests**

```tsx
// packages/react/src/Dialog/DialogFocusReturn.test.tsx
// D147: Dialog reports the platform's focus restore through onFocusReturn,
// after close(). jsdom restores nothing, so close() is spied to do what the
// platform does: return focus to the opener.
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dialog } from "./Dialog.js";
import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";

type Handler = (e: FocusReturnEvent<"close" | "unmount">) => void;

function Page({ open, show = true, onFocusReturn }: { open: boolean; show?: boolean; onFocusReturn?: Handler }) {
  return (
    <>
      <button>Opener</button>
      <button>Other</button>
      {show && (
        <Dialog open={open} onClose={() => {}} title="T" onFocusReturn={onFocusReturn}>
          <button>Inside</button>
        </Dialog>
      )}
    </>
  );
}

const opener = () => screen.getByRole("button", { name: "Opener" });
const other = () => screen.getByRole("button", { name: "Other" });
const inside = () => screen.getByText("Inside");

function restoreToOpener() {
  return vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    opener().focus();
  });
}

afterEach(() => vi.restoreAllMocks());

describe("Dialog: onFocusReturn (D147)", () => {
  it("reports a controlled close after the platform's restore", () => {
    restoreToOpener();
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Page open onFocusReturn={onFocusReturn} />);
    inside().focus();
    rerender(<Page open={false} onFocusReturn={onFocusReturn} />);
    expect(onFocusReturn).toHaveBeenCalledTimes(1);
    expect(onFocusReturn.mock.calls[0][0]).toMatchObject({ reason: "close", target: opener() });
    expect(opener()).toHaveFocus();
  });

  it("reports a removal while open as unmount", () => {
    restoreToOpener();
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Page open onFocusReturn={onFocusReturn} />);
    inside().focus();
    rerender(<Page open show={false} onFocusReturn={onFocusReturn} />);
    expect(onFocusReturn).toHaveBeenCalledTimes(1);
    expect(onFocusReturn.mock.calls[0][0]).toMatchObject({ reason: "unmount", target: opener() });
  });

  it("lets the handler take focus elsewhere", () => {
    restoreToOpener();
    const take: Handler = () => other().focus();
    const { rerender } = render(<Page open onFocusReturn={take} />);
    inside().focus();
    rerender(<Page open={false} onFocusReturn={take} />);
    expect(other()).toHaveFocus();
  });

  it("treats preventDefault as a no-op: the platform has already moved focus", () => {
    restoreToOpener();
    const prevent: Handler = (e) => e.preventDefault();
    const { rerender } = render(<Page open onFocusReturn={prevent} />);
    inside().focus();
    rerender(<Page open={false} onFocusReturn={prevent} />);
    expect(opener()).toHaveFocus();
  });

  it("is not called when focus was not in the dialog", () => {
    restoreToOpener();
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Page open onFocusReturn={onFocusReturn} />);
    other().focus();
    rerender(<Page open={false} onFocusReturn={onFocusReturn} />);
    expect(onFocusReturn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/Dialog/DialogFocusReturn.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement.** In `Dialog.tsx`:
  - Add the imports:
    `import { createFocusReturnEvent, isFocusLost, useLatestRef } from "../internal/focus/focusReturn.js";`
    and `import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";`.
  - After `DialogPlacement`, add:

```ts
/** Why Dialog hands focus back (D147): a controlled close, or removal while open (D136). */
export type DialogFocusReturnReason = "close" | "unmount";
```

  - Add to `DialogProps`, after `initialFocus`:

```ts
  /** Called after the dialog closes while focus is inside it (D147), once the
   * platform has returned focus to the opener: `event.target` is the element
   * now focused. Focus your own element in the handler to take over.
   * `preventDefault()` has no effect here, because the platform's restore in
   * `close()` cannot be stopped. `reason` is `"close"` for `open={false}` and
   * `"unmount"` for a dialog removed while open (D136). See the Focus guide. */
  onFocusReturn?: (event: FocusReturnEvent<DialogFocusReturnReason>) => void;
```

  - Add this module-level function, before `export function Dialog`:

```ts
/** D147: close, then report the platform's restore. The platform focuses the
 * opener inside close(), and a handler run before it could not focus outside
 * the still-open modal, so the event comes after. */
function closeAndReport(
  el: HTMLDialogElement,
  reason: DialogFocusReturnReason,
  onFocusReturn: ((event: FocusReturnEvent<DialogFocusReturnReason>) => void) | undefined,
) {
  const held = isFocusLost(el, { includeNowhere: false });
  el.close();
  if (!held || !onFocusReturn) return;
  const doc = el.ownerDocument;
  const active = doc.activeElement;
  const target =
    active instanceof HTMLElement && active !== doc.body && active !== doc.documentElement ? active : null;
  onFocusReturn(createFocusReturnEvent(target, reason));
}
```

  - Destructure `onFocusReturn` after `initialFocus`, so it never reaches
    `...rest`.
  - Add `const onFocusReturnRef = useLatestRef(onFocusReturn);` after
    `titleId`, before the `[open]` effect.
  - In the `[open]` effect, replace `else if (!open && el.open) el.close();`
    with:

```ts
    } else if (!open && el.open) closeAndReport(el, "close", onFocusReturnRef.current);
```

    Keep the brace structure valid.
  - In the D136 unmount layout effect, replace `if (el?.open) el.close();`
    with:

```ts
      if (el?.open) closeAndReport(el, "unmount", onFocusReturnRef.current);
```

  - In the component's JSDoc, after the D136 paragraph, add:
    "`onFocusReturn` reports that return after it happens, with reason
    `"close"` or `"unmount"`. Focusing another element in the handler takes
    over (D147)."

- [ ] **Step 4: Export.** In `index.ts`, line 37 becomes:

```ts
export type { DialogProps, DialogFocusReturnReason } from "./Dialog/Dialog.js";
```

- [ ] **Step 5: Run all the Dialog tests**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/Dialog`
Expected: PASS. `Dialog.test.tsx` is unchanged. Its D136 spies still see one
`close()` while the element is connected.

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/Dialog packages/react/src/index.ts
git commit -m "feat(react): Dialog reports the platform's focus restore (D147)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Docs, generated docs, changeset

**Files:**
- Create: `packages/docs/guides/focus.mdx`
- Modify: `packages/docs/src/pages.ts`: `GUIDE_ORDER` and `GUIDE_LABELS`
- Modify: `apps/site/site-gate/docs.spec.ts`: `GUIDE_IDS`
- Modify: `packages/react/src/a11y-meta.ts`: the `notes` of `Dialog`
  (line 72), `Menu` (line 146), `ToastRegion` (line 213) and `AppShell`
  (line 302)
- Modify: `packages/react/llms.txt`, line 86
- Regenerate: `packages/react/docs/*.md`, through the build
- Create: `.changeset/d147-focus-contract.md`

**Interfaces:**
- Consumes: the prop names, reasons and type names from Tasks 3 to 6.

- [ ] **Step 1: The guide.** Create `packages/docs/guides/focus.mdx`:

````mdx
---
title: Focus
description: When Psi moves focus for you, where it goes, and how to see, decline or redirect the move.
order: 7
---

Psi moves focus in two cases: when a part of the page that holds focus closes or goes away, and when the focused part of a widget disappears. It follows one rule for both.

## The rule

**Psi moves focus only when focus is lost.** Focus is lost when the element that held it is leaving, being removed, hidden or disabled, and focus has gone nowhere else. If the user or your code has already put focus somewhere, Psi leaves it there.

A container that is still in the page, such as a closing `Menu`, `Dialog` or sidebar, hands focus back only while focus is inside it. A click on the page that moved focus to `<body>` is the user's move, and stays.

## Hand-backs

| Component | When | Where focus goes | `reason` |
| --- | --- | --- | --- |
| `Dialog` | It closes, or is removed while open | The opener, restored by the platform | `"close"`, `"unmount"` |
| `Menu` | It closes while focus is inside | The trigger | `"close"` |
| `AppShell` | The sidebar closes while focus is inside | The toggle whose `aria-controls` names the sidebar, else `main` | `"sidebar-close"` |
| `ToastRegion` | The toast that held focus is removed | The toast now at its position; after a pointer dismissal, or once the stack is empty, the element focused before the region; else the region | `"toast-removed"` |

Each takes `onFocusReturn`. `ToastProvider` passes it to its region.

## Taking part: `onFocusReturn`

```ts
interface FocusReturnEvent<R extends string> {
  readonly target: HTMLElement | null; // where Psi is about to put focus
  readonly reason: R;
  preventDefault(): void;              // Psi does not move focus
  readonly defaultPrevented: boolean;
}
```

It runs at the moment of the hand-back, and only when focus is lost.

- **Take over:** focus your own element in the handler. Psi sees that focus is no longer lost and does not move it.
- **Opt out:** call `event.preventDefault()` and focus nothing.
- **Accept:** do nothing, or read `target` and `reason`.

```tsx
<Dialog
  open={open}
  onClose={() => setOpen(false)}
  title="Delete row"
  onFocusReturn={() => nextRowRef.current?.focus()}
>
  …
</Dialog>
```

After the row is deleted, focus goes to the next row, not to the menu button that opened the dialog and went away with the row.

**`Dialog` reports after the fact.** The browser returns focus to the opener inside the dialog's `close()`, and nothing can stop that. Until it closes, a modal dialog makes the rest of the page inert, so a handler run earlier could not focus anything outside it. `Dialog` therefore calls `onFocusReturn` after the restore. `target` is the opener, which already has focus. Focusing another element in the handler still takes over. `preventDefault()` does nothing.

## Rescues inside a widget

These keep focus inside a Psi widget, so its keyboard keeps working. They follow the same rule and take no handler.

| Component | When | Where focus goes |
| --- | --- | --- |
| `Menu` | The focused item is removed | The item now at its position; in an empty menu, the menu |
| `Pagination` | The arrow you pressed becomes disabled | The current page |
| `CursorPagination` | The arrow you pressed becomes disabled | The other arrow |

## Not covered

Focus a widget manages for itself (`Combobox`'s input, moving between `Tabs`, a `Menu` or `Dialog` focusing its first control on open) is not a hand-back. An `AppShell` whose `sidebar` content is removed while it holds focus loses that focus before Psi can act: close the sidebar first, with `sidebarOpen={false}`.
````

- [ ] **Step 2: Register it.** In `packages/docs/src/pages.ts`, append
  `"focus"` to `GUIDE_ORDER`, after `"ui-sdk"`, and add `focus: "Focus",` to
  `GUIDE_LABELS`. In `apps/site/site-gate/docs.spec.ts`, append `"focus"` to
  `GUIDE_IDS`, after `"ui-sdk"`.

- [ ] **Step 3: The a11y notes.** In `packages/react/src/a11y-meta.ts`,
  append one sentence to each named entry's `notes` string:
  - `Dialog`: ` onFocusReturn reports the platform's return of focus after close(), with reason "close" or "unmount"; focusing another element in it takes over (D147).`
  - `Menu`: ` onFocusReturn reports the return of focus to the trigger, reason "close", and can take it over or decline it (D147).`
  - `ToastRegion`: ` onFocusReturn reports a removed toast's hand-back, reason "toast-removed"; a removal after focus already went elsewhere hands nothing back (D147).`
  - `AppShell`: ` onFocusReturn reports the sidebar's hand-back, reason "sidebar-close" (D147).`

- [ ] **Step 4: llms.txt.** At the end of the `<Dialog …>` line (line 86),
  replace "Do not restore focus yourself." with:

  "Do not restore focus yourself. To send focus somewhere else, focus it in
  `onFocusReturn`, which `Dialog`, `Menu`, `AppShell` and `ToastRegion` (and
  `ToastProvider`) call at each focus hand-back with `{ target, reason,
  preventDefault }`. The Focus guide has the rule and the table (D147)."

- [ ] **Step 5: The changeset.** Create `.changeset/d147-focus-contract.md`:

```md
---
"@handamade/psi-react": minor
---

D147: one focus contract. `Dialog`, `Menu`, `AppShell` and `ToastRegion` (and `ToastProvider`) take `onFocusReturn(event)`, called when Psi hands focus back: `event.target` is where focus is going, and `event.reason` says why (`"close"`, `"unmount"`, `"sidebar-close"`, `"toast-removed"`). Focus your own element in the handler to take over, or call `event.preventDefault()` to leave focus where it is. `Dialog` reports after the browser's own restore, so there `preventDefault()` does nothing. Without a handler nothing changes. Fixed: a toast removed after your code had already moved focus elsewhere no longer lets a later toast take focus. New types: `FocusReturnEvent`, `DialogFocusReturnReason`, `MenuFocusReturnReason`, `AppShellFocusReturnReason`, `ToastFocusReturnReason`. The new Focus guide, also `guide:focus` in the MCP, has the rule and the table of every move.
```

- [ ] **Step 6: Build, which regenerates the docs**

Run: `pnpm build`
Expected: PASS. `git status` shows `packages/react/docs/Dialog.md`,
`Menu.md`, `AppShell.md`, `ToastRegion.md` and `ToastProvider.md` changed,
each with an `onFocusReturn` row. If `ToastProvider.md` lacks the row, check
that Task 3 Step 5 added the prop to `ToastProviderProps`.

- [ ] **Step 7: Run the docs and docs-drift checks**

Run: `node tools/check-docs-drift.mjs && pnpm --filter @handamade/psi-docs test`
Expected: PASS. If a test pins a guide count or a list of guide ids, update
that list to include `focus`. That is the only edit to an existing test this
plan allows, and the report must name it. To find the package name, read
`packages/docs/package.json`.

- [ ] **Step 8: Commit**

```bash
git add packages/docs apps/site/site-gate/docs.spec.ts packages/react/src/a11y-meta.ts packages/react/llms.txt packages/react/docs .changeset/d147-focus-contract.md
git commit -m "docs: a Focus guide, the hand-back in each component's docs, changeset (D147)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Gates, PR

- [ ] **Step 1: Check the decision number again.** D147 must still have
  no `## Decisions` entry in another spec on `origin/main`, and no other
  branch may claim it:

```bash
git fetch origin && git grep -n "D147" origin/main -- docs/superpowers/specs .changeset; git branch -r | grep -i d147
```

Expected: no spec but this one claims D147. If another does, stop and
report.

- [ ] **Step 2: Rebase on `origin/main`**

```bash
git rebase origin/main
```

- [ ] **Step 3: The five gates**

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
```

Expected: every gate passes. Save the output to the SDD workspace's
`gates.log`.

- [ ] **Step 4: Push, open the PR and arm auto-merge**

```bash
git push -u origin d147-focus-contract
gh pr create --base main --title "feat: one focus contract, onFocusReturn on the hand-backs, and the ToastRegion stale-focus fix (D147)" --body-file <pr-body.md>
gh pr merge <n> --auto --squash
gh pr view <n> --json autoMergeRequest
```

Expected: `autoMergeRequest` is not null. If it is null, use the
`enablePullRequestAutoMerge` GraphQL mutation.

The PR body:
- summarises the spec;
- lists the new tests;
- states that every existing focus test passes unedited;
- says the Figma library needs nothing: no token, no component and no
  visual change;
- ends with "🤖 Generated with [Claude Code](https://claude.com/claude-code)".

`vr` runs in CI and should report 0 differing pixels.
