# Menu Cycle Implementation Plan (D53)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `Menu`, `MenuItem` and `MenuSeparator` — Psi's overlay tier — on the native Popover API, placed by CSS anchor positioning above the anchor floor and a gated JS branch below it.

**Architecture:** `Menu` renders its `trigger` plus a `popover="auto"` div. The platform supplies the top layer, light-dismiss and Esc; Menu syncs open state with `showPopover()`/`hidePopover()` in an effect, exactly as `Dialog` syncs `showModal()`/`close()`. Placement is pure CSS above the anchor floor and a `CSS.supports`-gated `getBoundingClientRect` branch below it. Keyboard behaviour lives in one hook, `useMenuKeyboard`. Item state flows down through a context so `MenuItem` needs no props from the consumer beyond its own.

**Tech Stack:** React 19, TypeScript, CSS Modules, vitest + @testing-library/react + axe-core, Playwright VR, changesets. Zero new runtime dependencies — `@handamade/psi-react` keeps `dependencies: {}`.

**Spec:** `docs/superpowers/specs/2026-07-31-menu-cycle-design.md`. **Linear:** HAN-44.

## Global Constraints

Every task's requirements implicitly include this section.

- **Node 24 is required and is now the default.** `pnpm` 11.9 needs `node:sqlite` and dies on Node 20. `nvm alias default` is `24` and `~/.zshenv` resolves it by glob, so fresh shells — interactive, login and non-interactive alike — already get v24.16.0; no prefix needed. Verify with `node -v` before starting. If it reports v20 you are in a shell process that predates that setup: open a new one rather than prefixing commands.
- **Zero new runtime dependencies.** `packages/react/package.json` `dependencies` stays `{}`.
- **Sizes are px numbers** (`24 | 32 | 40 | 48`), never S/M/L. Scale names are pixel-true (`psi-gap-8` = 8px).
- **Variants are flat:** `accent | accent-subtle | neutral | neutral-subtle | ghost | danger | danger-subtle | outline`. No primary/secondary. `danger` only for destructive actions.
- **Never hardcode colors in component CSS.** Component CSS may bind only `--psi-<component>-*` and scale tokens; the custom stylelint plugin (`tools/stylelint-plugin-psi-tokens.mjs`) enforces this and will fail `pnpm lint`.
- **New token values go in `packages/tokens/src`, never in `dist`.** `dist` is generated.
- **Browser floor is unchanged:** Chrome/Edge 119+, Safari 18+, Firefox 128+. The Popover API is under this floor. CSS anchor positioning is *above* it (Chrome 125+ / Firefox 132+ / Safari 18.2+; `@position-try` needs Firefox 147+ / Safari 26+), which is why the JS fallback branch exists.
- **Gate chain for every commit:** `pnpm build` (WCAG AA contrast + D46 scopes — throws on failure), `pnpm test`, `pnpm lint`.
- **VR baselines are Linux-only.** New-story baselines come from CI's `vr-baselines` artifact: push, let the designed VR failure run, download the artifact, commit the PNGs.
- **Naming:** the component directory is `packages/react/src/Menu/`, the CSS module is `menu.module.css`, the token source is `packages/tokens/src/components/menu.ts`.

---

### Task 1: Menu token family

Pure indirection onto the D51 surface family, exactly like `panel.ts` and `dialog.ts`. Item states reuse existing recipes so the contrast gate has only new item-on-surface pairs to prove.

**Files:**
- Create: `packages/tokens/src/components/menu.ts`
- Modify: `packages/tokens/scripts/build.ts` (import near line 32, registry entry near line 79)
- Test: `packages/tokens/__tests__/menu-tokens.test.ts`

**Interfaces:**
- Consumes: `emitComponentVarsCSS(name, vars)` from `packages/tokens/scripts/emit-components.js`; `--psi-surface-bg`, `--psi-surface-border`, `--psi-surface-radius` (D51); `--psi-fill-neutral3`, `--psi-fill-neutral4`, `--psi-fg-primary`, `--psi-fg-danger`, `--psi-fg-muted`.
- Produces: `menuVars: Record<string, string>`, emitted as `--psi-menu-*` custom properties. Task 5's CSS binds only these.

- [ ] **Step 1: Write the failing test**

Create `packages/tokens/__tests__/menu-tokens.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { menuVars } from "../src/components/menu.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";

describe("menu tokens", () => {
  it("declares the D53 tokens bound to gated semantics", () => {
    expect(menuVars).toEqual({
      bg: "var(--psi-surface-bg)",
      border: "var(--psi-surface-border)",
      radius: "var(--psi-surface-radius)",
      fg: "var(--psi-fg-primary)",
      "item-bg": "transparent",
      "item-bg-hover": "var(--psi-fill-neutral3)",
      "item-bg-active": "var(--psi-fill-neutral4)",
      "item-fg": "var(--psi-fg-primary)",
      "item-fg-danger": "var(--psi-fg-danger)",
      "item-fg-disabled": "var(--psi-fg-muted)",
      "separator-border": "var(--psi-border-faint)",
    });
  });

  it("emits --psi-menu-* custom properties", () => {
    const css = emitComponentVarsCSS("menu", menuVars);
    expect(css).toContain("--psi-menu-bg: var(--psi-surface-bg)");
    expect(css).toContain("--psi-menu-radius: var(--psi-surface-radius)");
    expect(css).toContain("--psi-menu-item-bg-hover: var(--psi-fill-neutral3)");
    expect(css).toContain("--psi-menu-item-fg-danger: var(--psi-fg-danger)");
    expect(css).toContain("--psi-menu-separator-border: var(--psi-border-faint)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run packages/tokens/__tests__/menu-tokens.test.ts
```

Expected: FAIL — `Cannot find module '../src/components/menu.js'`.

- [ ] **Step 3: Write the token source**

Create `packages/tokens/src/components/menu.ts`:

```ts
/** Menu component tokens (--psi-menu-*) — D53. Container is pure indirection
 * onto the shared surface family (same posture as panel.ts and dialog.ts);
 * item states reuse Button's ghost recipe rather than introducing anchors, so
 * a brand retuning --psi-surface-* gets Menu for free. */
export const menuVars: Record<string, string> = {
  bg: "var(--psi-surface-bg)",
  border: "var(--psi-surface-border)",
  radius: "var(--psi-surface-radius)",
  fg: "var(--psi-fg-primary)",
  "item-bg": "transparent",
  "item-bg-hover": "var(--psi-fill-neutral3)",
  "item-bg-active": "var(--psi-fill-neutral4)",
  "item-fg": "var(--psi-fg-primary)",
  "item-fg-danger": "var(--psi-fg-danger)",
  "item-fg-disabled": "var(--psi-fg-muted)",
  "separator-border": "var(--psi-border-faint)",
};
```

- [ ] **Step 4: Register it in the token build**

In `packages/tokens/scripts/build.ts`, add the import alongside the other component imports (they are alphabetical, so it goes after `mediaVars` and before `navbarVars`):

```ts
import { menuVars } from "../src/components/menu.js";
```

And add the registry entry in `componentVars`, keeping alphabetical order (after `media`, before `navbar`):

```ts
  menu: menuVars,
```

- [ ] **Step 5: Run the test and the token build**

```bash
pnpm vitest run packages/tokens/__tests__/menu-tokens.test.ts && pnpm --filter @handamade/psi-tokens build
```

Expected: test PASS; build prints no gamut warnings and exits 0. The build is the WCAG AA contrast gate and the D46 scope gate — if a token name or binding is wrong it throws here, not later.

- [ ] **Step 6: Verify the emitted CSS**

```bash
grep -c "psi-menu-" packages/tokens/dist/components.css
```

Expected: `11` (one line per token).

- [ ] **Step 7: Commit**

```bash
git add packages/tokens/src/components/menu.ts packages/tokens/scripts/build.ts packages/tokens/__tests__/menu-tokens.test.ts
git commit -m "feat(tokens): --psi-menu-* family on the D51 surface family (D53)"
```

---

### Task 2: jsdom Popover polyfill

jsdom implements neither `showPopover`/`hidePopover` nor the `popover` attribute's behaviour, so every Menu test in Tasks 3–5 fails without this. It mirrors the existing `HTMLDialogElement` polyfill directly above it.

**Files:**
- Modify: `vitest.setup.ts` (append after the existing dialog polyfill block)
- Test: `packages/react/src/Menu/popover-polyfill.test.tsx`

**Interfaces:**
- Produces: working `HTMLElement.prototype.showPopover` / `hidePopover` in jsdom, which toggle a `data-open` attribute the tests and Tasks 3–5 assert on. Real browsers use the native implementation; this only fills the jsdom gap.

- [ ] **Step 1: Write the failing test**

Create `packages/react/src/Menu/popover-polyfill.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";

describe("jsdom popover polyfill", () => {
  it("showPopover and hidePopover exist and toggle data-open", () => {
    const el = document.createElement("div");
    el.setAttribute("popover", "auto");
    document.body.appendChild(el);

    expect(typeof el.showPopover).toBe("function");
    el.showPopover();
    expect(el.getAttribute("data-open")).toBe("");

    el.hidePopover();
    expect(el.hasAttribute("data-open")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run packages/react/src/Menu/popover-polyfill.test.tsx
```

Expected: FAIL — `expected "undefined" to be "function"`.

- [ ] **Step 3: Add the polyfill**

Append to `vitest.setup.ts`, after the existing `HTMLDialogElement.prototype.close` block:

```ts
// Polyfill Popover API for jsdom (D53 — Menu). Mirrors the dialog polyfill
// above: enough surface for controlled open/close assertions, not a spec
// implementation. Real browsers use the native API; the top layer, light
// dismiss and Esc are exercised in Playwright VR, not here.
if (!HTMLElement.prototype.showPopover) {
  HTMLElement.prototype.showPopover = function () {
    this.setAttribute("data-open", "");
    this.dispatchEvent(new Event("toggle"));
  };
}

if (!HTMLElement.prototype.hidePopover) {
  HTMLElement.prototype.hidePopover = function () {
    this.removeAttribute("data-open");
    this.dispatchEvent(new Event("toggle"));
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run packages/react/src/Menu/popover-polyfill.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Confirm nothing else broke**

```bash
pnpm test
```

Expected: all suites pass (448 + 1 new).

- [ ] **Step 6: Commit**

```bash
git add vitest.setup.ts packages/react/src/Menu/popover-polyfill.test.tsx
git commit -m "test: jsdom Popover API polyfill for Menu (D53)"
```

---

### Task 3: Menu shell — controlled open/close and dismissal reasons

The container only. Items come in Task 4, keyboard in Task 5, placement in Task 6. Controlled-only per D50: no internal open state, no trigger-owned toggling.

**Files:**
- Create: `packages/react/src/Menu/Menu.tsx`
- Create: `packages/react/src/Menu/menu.module.css` (minimal — full placement in Task 6)
- Test: `packages/react/src/Menu/Menu.test.tsx`

**Interfaces:**
- Consumes: `menuVars` from Task 1 (as `--psi-menu-*` in CSS); the jsdom polyfill from Task 2.
- Produces:
  - `export interface MenuProps` with `open: boolean`, `onClose: (reason: "esc" | "outside" | "item-select") => void`, `trigger: ReactNode`, `placement?: Placement`, `children: ReactNode`, `className?: string`, `ref?: Ref<HTMLDivElement>`.
  - `export type Placement = "bottom-start" | "bottom-end" | "top-start" | "top-end"`.
  - `export const MenuContext: React.Context<MenuContextValue>` where `interface MenuContextValue { close: (reason: "item-select") => void }` — Task 4's `MenuItem` consumes this to report selection without prop drilling.
  - The popover element carries `role="menu"` and `data-psi-menu`; the trigger wrapper carries `data-psi-menu-trigger`.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/src/Menu/Menu.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Menu } from "./Menu.js";
import { Button } from "../Button/Button.js";

const trigger = <Button size={32}>Actions</Button>;

describe("Menu", () => {
  it("renders the trigger and does not open the popover when open=false", () => {
    render(<Menu open={false} onClose={() => {}} trigger={trigger} aria-label="Actions">x</Menu>);
    expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
    expect(document.querySelector("[data-psi-menu]")).not.toHaveAttribute("data-open");
  });

  it("calls showPopover when open flips to true", () => {
    const { rerender } = render(
      <Menu open={false} onClose={() => {}} trigger={trigger} aria-label="Actions">x</Menu>,
    );
    rerender(<Menu open onClose={() => {}} trigger={trigger} aria-label="Actions">x</Menu>);
    expect(document.querySelector("[data-psi-menu]")).toHaveAttribute("data-open");
  });

  it("wires aria-haspopup and aria-expanded onto the trigger", () => {
    const { rerender } = render(
      <Menu open={false} onClose={() => {}} trigger={trigger} aria-label="Actions">x</Menu>,
    );
    const btn = screen.getByRole("button", { name: "Actions" });
    expect(btn).toHaveAttribute("aria-haspopup", "menu");
    expect(btn).toHaveAttribute("aria-expanded", "false");
    rerender(<Menu open onClose={() => {}} trigger={trigger} aria-label="Actions">x</Menu>);
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("Esc calls onClose('esc')", () => {
    const onClose = vi.fn();
    render(<Menu open onClose={onClose} trigger={trigger} aria-label="Actions">x</Menu>);
    fireEvent.keyDown(document.querySelector("[data-psi-menu]")!, { key: "Escape" });
    expect(onClose).toHaveBeenCalledWith("esc");
  });

  it("a native toggle-to-closed with no attributed reason reports 'outside'", () => {
    const onClose = vi.fn();
    render(<Menu open onClose={onClose} trigger={trigger} aria-label="Actions">x</Menu>);
    const popover = document.querySelector("[data-psi-menu]")!;
    popover.removeAttribute("data-open");
    fireEvent(popover, new Event("toggle"));
    expect(onClose).toHaveBeenCalledWith("outside");
  });

  it("applies role=menu and the accessible name", () => {
    render(<Menu open onClose={() => {}} trigger={trigger} aria-label="Row actions">x</Menu>);
    expect(screen.getByRole("menu", { name: "Row actions" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run packages/react/src/Menu/Menu.test.tsx
```

Expected: FAIL — `Cannot find module './Menu.js'`.

- [ ] **Step 3: Write the minimal CSS module**

Create `packages/react/src/Menu/menu.module.css` (placement rules land in Task 6):

```css
/* ── Trigger wrapper ──────────────────────────────────────────── */

.trigger {
  display: inline-flex;
}

/* ── Popover surface ──────────────────────────────────────────── */

.menu {
  min-width: 180px;
  margin: 0;
  padding: var(--psi-space-4);
  border: 1px solid var(--psi-menu-border);
  border-radius: var(--psi-menu-radius);
  background: var(--psi-menu-bg);
  color: var(--psi-menu-fg);
  font: var(--psi-text-14-20-regular);
}

.menu:not([data-open]):not(:popover-open) {
  display: none;
}
```

- [ ] **Step 4: Write the component**

Create `packages/react/src/Menu/Menu.tsx`:

```tsx
import { createContext, useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode, Ref } from "react";
import styles from "./menu.module.css";

export type Placement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export interface MenuContextValue {
  close: (reason: "item-select") => void;
}

export const MenuContext = createContext<MenuContextValue>({ close: () => {} });

export interface MenuProps {
  /** Controlled open state; syncs to showPopover()/hidePopover(). */
  open: boolean;
  /** Called on every dismissal path with its source; the consumer flips `open`. */
  onClose: (reason: "esc" | "outside" | "item-select") => void;
  /** Rendered by Menu, which owns its anchor-name and aria-haspopup wiring. */
  trigger: ReactNode;
  /** Placement relative to the trigger. @default "bottom-start" */
  placement?: Placement;
  /** Accessible name for the menu when there is no visible label. */
  "aria-label"?: string;
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the popover element. */
  ref?: Ref<HTMLDivElement>;
}

/** Action menu on the native Popover API top layer: top layer, light dismiss
 * and Esc come from the platform; roving keyboard, placement and dismissal
 * reasons are Psi's (D53). Controlled-only, like Dialog (D50). */
export function Menu({
  open,
  onClose,
  trigger,
  placement = "bottom-start",
  children,
  className,
  ref,
  ...rest
}: MenuProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  // Set when Psi itself caused the close, so the toggle handler does not
  // also report "outside" for a dismissal it already attributed.
  const reasonRef = useRef<"esc" | "item-select" | null>(null);

  const setRef = (node: HTMLDivElement | null) => {
    popoverRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    const isOpen = el.hasAttribute("data-open") || el.matches(":popover-open");
    if (open && !isOpen) el.showPopover();
    else if (!open && isOpen) el.hidePopover();
  }, [open]);

  const handleToggle = useCallback(() => {
    const el = popoverRef.current;
    if (!el) return;
    const isOpen = el.hasAttribute("data-open") || el.matches(":popover-open");
    if (isOpen) return;
    const attributed = reasonRef.current;
    reasonRef.current = null;
    onClose(attributed ?? "outside");
  }, [onClose]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    reasonRef.current = "esc";
    onClose("esc");
  };

  const close = useCallback(
    (reason: "item-select") => {
      reasonRef.current = reason;
      onClose(reason);
    },
    [onClose],
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={styles.trigger}
        data-psi-menu-trigger
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </div>
      <div
        {...rest}
        ref={setRef}
        popover="auto"
        role="menu"
        data-psi-menu
        data-placement={placement}
        className={[styles.menu, className].filter(Boolean).join(" ")}
        onToggle={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <MenuContext.Provider value={{ close }}>{children}</MenuContext.Provider>
      </div>
    </>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm vitest run packages/react/src/Menu/Menu.test.tsx
```

Expected: PASS, 6 tests.

Note on the `aria-haspopup` test: it asserts the attribute lands on the trigger *wrapper*, and `getByRole("button")` finds the inner Button. If the assertion fails because the attribute is on the wrapper rather than the button, change the test to read `screen.getByRole("button", { name: "Actions" }).closest("[data-psi-menu-trigger]")`. Do not move the attribute onto the consumer's element — Menu does not own the trigger's internals.

- [ ] **Step 6: Lint (the stylelint plugin gates the CSS)**

```bash
pnpm lint
```

Expected: exit 0. If stylelint reports a non-`--psi-menu-*` colour binding, the CSS is wrong — component CSS may bind only its own family plus scale tokens.

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/Menu/
git commit -m "feat(react): Menu shell on the Popover API, controlled-only (D53)"
```

---

### Task 4: MenuItem and MenuSeparator

**Files:**
- Create: `packages/react/src/Menu/MenuItem.tsx`
- Create: `packages/react/src/Menu/MenuSeparator.tsx`
- Modify: `packages/react/src/Menu/menu.module.css` (append item and separator rules)
- Test: `packages/react/src/Menu/MenuItem.test.tsx`

**Interfaces:**
- Consumes: `MenuContext` from Task 3 — `useContext(MenuContext).close("item-select")`.
- Produces:
  - `export interface MenuItemProps { children: ReactNode; onSelect: () => void; variant?: "neutral" | "danger"; disabled?: boolean }`
  - `export function MenuItem(props: MenuItemProps)` — renders `<button type="button" role="menuitem" data-psi-menu-item>`; Task 5's keyboard hook queries `[data-psi-menu-item]:not([aria-disabled="true"])` to build its roving order.
  - `export function MenuSeparator()` — renders `<div role="separator" data-psi-menu-separator>`, no props.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/src/Menu/MenuItem.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Menu } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { MenuSeparator } from "./MenuSeparator.js";
import { Button } from "../Button/Button.js";

const trigger = <Button size={32}>Actions</Button>;

function open(onClose = () => {}, onSelect = () => {}) {
  return render(
    <Menu open onClose={onClose} trigger={trigger} aria-label="Actions">
      <MenuItem onSelect={onSelect}>Rename</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={onSelect} variant="danger">Delete</MenuItem>
      <MenuItem onSelect={onSelect} disabled>Archive</MenuItem>
    </Menu>,
  );
}

describe("MenuItem", () => {
  it("renders items with role=menuitem", () => {
    open();
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
  });

  it("clicking an item fires onSelect and closes with 'item-select'", async () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();
    open(onClose, onSelect);
    await userEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledWith("item-select");
  });

  it("a disabled item is aria-disabled and fires neither callback", async () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();
    open(onClose, onSelect);
    const archive = screen.getByRole("menuitem", { name: "Archive" });
    expect(archive).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(archive);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("marks the danger variant on the element for styling", () => {
    open();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
      "data-variant",
      "danger",
    );
  });

  it("renders a separator with role=separator", () => {
    open();
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run packages/react/src/Menu/MenuItem.test.tsx
```

Expected: FAIL — `Cannot find module './MenuItem.js'`.

- [ ] **Step 3: Write MenuItem**

Create `packages/react/src/Menu/MenuItem.tsx`:

```tsx
import { useContext } from "react";
import type { ReactNode } from "react";
import { MenuContext } from "./Menu.js";
import styles from "./menu.module.css";

export interface MenuItemProps {
  children: ReactNode;
  /** Fires on activation; Menu then closes with reason "item-select". */
  onSelect: () => void;
  /** danger is for destructive actions only (house rule). @default "neutral" */
  variant?: "neutral" | "danger";
  disabled?: boolean;
}

/** One action in a Menu. Renders a real <button> so activation, Enter and
 * Space come from the platform; the roving tabindex is applied by Menu's
 * keyboard hook, which finds items via [data-psi-menu-item] (D53). */
export function MenuItem({ children, onSelect, variant = "neutral", disabled = false }: MenuItemProps) {
  const { close } = useContext(MenuContext);

  return (
    <button
      type="button"
      role="menuitem"
      data-psi-menu-item
      data-variant={variant}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      className={styles.item}
      onClick={() => {
        if (disabled) return;
        onSelect();
        close("item-select");
      }}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Write MenuSeparator**

Create `packages/react/src/Menu/MenuSeparator.tsx`:

```tsx
import styles from "./menu.module.css";

/** Hairline rule between Menu item groups. No props by design (D53). */
export function MenuSeparator() {
  return <div role="separator" data-psi-menu-separator className={styles.separator} />;
}
```

- [ ] **Step 5: Append the CSS**

Append to `packages/react/src/Menu/menu.module.css`:

```css
/* ── Items ────────────────────────────────────────────────────── */

.item {
  display: flex;
  width: 100%;
  align-items: center;
  padding: var(--psi-space-8) var(--psi-space-12);
  border: 0;
  border-radius: var(--psi-radius-6);
  background: var(--psi-menu-item-bg);
  color: var(--psi-menu-item-fg);
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.item:hover {
  background: var(--psi-menu-item-bg-hover);
}

.item:active {
  background: var(--psi-menu-item-bg-active);
}

.item[data-variant="danger"] {
  color: var(--psi-menu-item-fg-danger);
}

.item[aria-disabled="true"] {
  color: var(--psi-menu-item-fg-disabled);
  cursor: default;
}

.item[aria-disabled="true"]:hover {
  background: var(--psi-menu-item-bg);
}

/* ── Separator ────────────────────────────────────────────────── */

.separator {
  height: 1px;
  margin: var(--psi-space-4) 0;
  background: var(--psi-menu-separator-border);
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm vitest run packages/react/src/Menu/
```

Expected: PASS, all Menu suites.

- [ ] **Step 7: Lint and commit**

```bash
pnpm lint
git add packages/react/src/Menu/
git commit -m "feat(react): MenuItem and MenuSeparator (D53)"
```

---

### Task 5: Keyboard navigation hook

Psi's first keyboard-navigation JS. One hook, one file, so it is reviewable and testable on its own.

**Files:**
- Create: `packages/react/src/Menu/useMenuKeyboard.ts`
- Modify: `packages/react/src/Menu/Menu.tsx` (call the hook, move Esc handling into it)
- Test: `packages/react/src/Menu/useMenuKeyboard.test.tsx`

**Interfaces:**
- Consumes: the popover element ref from Task 3; `[data-psi-menu-item]` elements from Task 4.
- Produces: `export function useMenuKeyboard(opts: { popoverRef: RefObject<HTMLDivElement | null>; triggerRef: RefObject<HTMLDivElement | null>; open: boolean; onEsc: () => void }): (event: KeyboardEvent<HTMLDivElement>) => void` — returns the `onKeyDown` handler Menu spreads onto the popover.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/src/Menu/useMenuKeyboard.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Menu } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { Button } from "../Button/Button.js";

const trigger = <Button size={32}>Actions</Button>;

function openMenu(onClose = () => {}) {
  return render(
    <Menu open onClose={onClose} trigger={trigger} aria-label="Actions">
      <MenuItem onSelect={() => {}}>Rename</MenuItem>
      <MenuItem onSelect={() => {}}>Duplicate</MenuItem>
      <MenuItem onSelect={() => {}} disabled>Archive</MenuItem>
      <MenuItem onSelect={() => {}}>Delete</MenuItem>
    </Menu>,
  );
}

const items = () => screen.getAllByRole("menuitem");

describe("useMenuKeyboard", () => {
  it("focuses the first enabled item when the menu opens", () => {
    openMenu();
    expect(items()[0]).toHaveFocus();
  });

  it("ArrowDown moves to the next enabled item, skipping disabled", async () => {
    openMenu();
    await userEvent.keyboard("{ArrowDown}");
    expect(items()[1]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(items()[3]).toHaveFocus(); // Archive (index 2) is disabled
  });

  it("ArrowDown wraps from the last item to the first", async () => {
    openMenu();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(items()[0]).toHaveFocus();
  });

  it("ArrowUp moves backwards and wraps", async () => {
    openMenu();
    await userEvent.keyboard("{ArrowUp}");
    expect(items()[3]).toHaveFocus();
  });

  it("Home and End jump to the first and last enabled items", async () => {
    openMenu();
    await userEvent.keyboard("{End}");
    expect(items()[3]).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(items()[0]).toHaveFocus();
  });

  it("typeahead focuses the first item whose label starts with the typed text", async () => {
    openMenu();
    await userEvent.keyboard("du");
    expect(items()[1]).toHaveFocus();
  });

  it("typeahead skips disabled items", async () => {
    openMenu();
    await userEvent.keyboard("a");
    expect(items()[2]).not.toHaveFocus();
  });

  it("Esc reports the reason and returns focus to the trigger", async () => {
    const onClose = vi.fn();
    openMenu(onClose);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledWith("esc");
    expect(screen.getByRole("button", { name: "Actions" })).toHaveFocus();
  });

  it("only the focused item is in the tab order", async () => {
    openMenu();
    expect(items()[0]).toHaveAttribute("tabindex", "0");
    expect(items()[1]).toHaveAttribute("tabindex", "-1");
    await userEvent.keyboard("{ArrowDown}");
    expect(items()[0]).toHaveAttribute("tabindex", "-1");
    expect(items()[1]).toHaveAttribute("tabindex", "0");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run packages/react/src/Menu/useMenuKeyboard.test.tsx
```

Expected: FAIL — first item does not receive focus.

- [ ] **Step 3: Write the hook**

Create `packages/react/src/Menu/useMenuKeyboard.ts`:

```ts
import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";

/** How long consecutive keystrokes accumulate into one typeahead query. */
const TYPEAHEAD_RESET_MS = 500;

interface Options {
  popoverRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  onEsc: () => void;
}

/** Roving-tabindex keyboard navigation for Menu (D53): Up/Down with wrap,
 * Home/End, character typeahead, Esc with focus return. Disabled items are
 * skipped everywhere. Psi's only keyboard-navigation JS — a deliberate
 * departure from D52, which refused role="toolbar" precisely to avoid it. */
export function useMenuKeyboard({ popoverRef, triggerRef, open, onEsc }: Options) {
  const queryRef = useRef("");
  const queryAtRef = useRef(0);

  const enabledItems = useCallback((): HTMLElement[] => {
    const root = popoverRef.current;
    if (!root) return [];
    return Array.from(
      root.querySelectorAll<HTMLElement>('[data-psi-menu-item]:not([aria-disabled="true"])'),
    );
  }, [popoverRef]);

  const focusItem = useCallback(
    (item: HTMLElement | undefined) => {
      if (!item) return;
      for (const other of enabledItems()) other.tabIndex = other === item ? 0 : -1;
      item.focus();
    },
    [enabledItems],
  );

  // Focus the first enabled item on open; restore focus to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const items = enabledItems();
    focusItem(items[0]);
    return () => {
      const triggerEl = triggerRef.current?.querySelector<HTMLElement>(
        "button, a, [tabindex]",
      );
      triggerEl?.focus();
    };
  }, [open, enabledItems, focusItem, triggerRef]);

  return useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const items = enabledItems();
      if (items.length === 0) return;
      const current = items.indexOf(document.activeElement as HTMLElement);

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          onEsc();
          return;
        case "ArrowDown":
          event.preventDefault();
          focusItem(items[(current + 1 + items.length) % items.length]);
          return;
        case "ArrowUp":
          event.preventDefault();
          focusItem(items[(current - 1 + items.length) % items.length]);
          return;
        case "Home":
          event.preventDefault();
          focusItem(items[0]);
          return;
        case "End":
          event.preventDefault();
          focusItem(items[items.length - 1]);
          return;
        default:
          break;
      }

      // Typeahead: single printable characters accumulate into a prefix query.
      if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
      const now = Date.now();
      queryRef.current = now - queryAtRef.current > TYPEAHEAD_RESET_MS
        ? event.key.toLowerCase()
        : queryRef.current + event.key.toLowerCase();
      queryAtRef.current = now;

      const match = items.find((item) =>
        (item.textContent ?? "").trim().toLowerCase().startsWith(queryRef.current),
      );
      if (match) {
        event.preventDefault();
        focusItem(match);
      }
    },
    [enabledItems, focusItem, onEsc],
  );
}
```

- [ ] **Step 4: Wire the hook into Menu**

In `packages/react/src/Menu/Menu.tsx`, add the import:

```tsx
import { useMenuKeyboard } from "./useMenuKeyboard.js";
```

Replace the inline `handleKeyDown` definition with a call to the hook, placed after `close` is defined:

```tsx
  const handleKeyDown = useMenuKeyboard({
    popoverRef,
    triggerRef,
    open,
    onEsc: () => {
      reasonRef.current = "esc";
      onClose("esc");
    },
  });
```

Delete the previous `const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => { ... }` block and the now-unused `KeyboardEvent` type import. The JSX `onKeyDown={handleKeyDown}` stays as it is.

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm vitest run packages/react/src/Menu/
```

Expected: PASS, all Menu suites including the 9 keyboard tests.

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/Menu/
git commit -m "feat(react): Menu roving-tabindex keyboard hook with typeahead (D53)"
```

---

### Task 6: Placement — anchor CSS plus the gated JS fallback

**Files:**
- Modify: `packages/react/src/Menu/menu.module.css` (anchor rules)
- Create: `packages/react/src/Menu/useMenuPlacement.ts`
- Modify: `packages/react/src/Menu/Menu.tsx` (call the placement hook, set `anchor-name`)
- Test: `packages/react/src/Menu/useMenuPlacement.test.tsx`

**Interfaces:**
- Consumes: `Placement` and both refs from Task 3.
- Produces: `export function useMenuPlacement(opts: { popoverRef: RefObject<HTMLDivElement | null>; triggerRef: RefObject<HTMLDivElement | null>; open: boolean; placement: Placement; anchorName: string }): void` — a side-effect-only hook. Above the anchor floor it does nothing (CSS handles placement); below it, it sets `inset` from `getBoundingClientRect()` and keeps it current on scroll and resize.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/src/Menu/useMenuPlacement.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Menu } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { Button } from "../Button/Button.js";

const trigger = <Button size={32}>Actions</Button>;

function renderMenu() {
  return render(
    <Menu open onClose={() => {}} trigger={trigger} placement="bottom-start" aria-label="Actions">
      <MenuItem onSelect={() => {}}>Rename</MenuItem>
    </Menu>,
  );
}

describe("useMenuPlacement", () => {
  const originalSupports = CSS.supports;

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 100, y: 50, top: 50, left: 100, bottom: 82, right: 180,
      width: 80, height: 32, toJSON: () => ({}),
    } as DOMRect);
  });

  afterEach(() => {
    CSS.supports = originalSupports;
    vi.restoreAllMocks();
  });

  it("leaves inset alone when anchor positioning is supported", () => {
    CSS.supports = vi.fn().mockReturnValue(true);
    renderMenu();
    const popover = document.querySelector<HTMLElement>("[data-psi-menu]")!;
    expect(popover.style.top).toBe("");
    expect(popover.style.left).toBe("");
  });

  it("sets inset from the trigger rect when anchor positioning is unsupported", () => {
    CSS.supports = vi.fn().mockReturnValue(false);
    renderMenu();
    const popover = document.querySelector<HTMLElement>("[data-psi-menu]")!;
    expect(popover.style.top).toBe("82px"); // trigger bottom
    expect(popover.style.left).toBe("100px"); // trigger left, "-start"
  });

  it("declares an anchor-name linking the trigger and the popover", () => {
    CSS.supports = vi.fn().mockReturnValue(true);
    renderMenu();
    const wrapper = document.querySelector<HTMLElement>("[data-psi-menu-trigger]")!;
    const popover = document.querySelector<HTMLElement>("[data-psi-menu]")!;
    const name = wrapper.style.getPropertyValue("anchor-name");
    expect(name).toMatch(/^--psi-menu-/);
    expect(popover.style.getPropertyValue("position-anchor")).toBe(name);
  });

  it("carries the placement onto the element for the CSS rules to key off", () => {
    CSS.supports = vi.fn().mockReturnValue(true);
    renderMenu();
    expect(document.querySelector("[data-psi-menu]")).toHaveAttribute(
      "data-placement",
      "bottom-start",
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run packages/react/src/Menu/useMenuPlacement.test.tsx
```

Expected: FAIL — `Cannot find module './useMenuPlacement.js'`, plus missing `anchor-name`.

- [ ] **Step 3: Write the placement hook**

Create `packages/react/src/Menu/useMenuPlacement.ts`:

```ts
import { useEffect } from "react";
import type { RefObject } from "react";
import type { Placement } from "./Menu.js";

/** True when the browser can place the popover declaratively. Above this
 * floor the hook is inert and CSS does all the work. */
function supportsAnchor(): boolean {
  return typeof CSS !== "undefined" && CSS.supports("anchor-name", "--x");
}

interface Options {
  popoverRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  placement: Placement;
  anchorName: string;
}

/** Placement for Menu (D53). Above the anchor floor this hook only declares
 * anchor-name / position-anchor and lets CSS position the popover. Below it,
 * a top-layer element's containing block is the viewport — there is no
 * declarative way to place it near its trigger — so this sets `inset` from
 * the trigger rect and keeps it current. That branch is dead code above the
 * anchor floor and is deletable outright once the floor rises. */
export function useMenuPlacement({ popoverRef, triggerRef, open, placement, anchorName }: Options) {
  // Declare the anchor relationship. Harmless where unsupported.
  useEffect(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;
    trigger.style.setProperty("anchor-name", anchorName);
    popover.style.setProperty("position-anchor", anchorName);
  }, [popoverRef, triggerRef, anchorName]);

  // Fallback branch: only below the anchor floor.
  useEffect(() => {
    if (!open || supportsAnchor()) return;
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;

    const place = () => {
      const rect = trigger.getBoundingClientRect();
      const below = placement.startsWith("bottom");
      const alignEnd = placement.endsWith("end");
      popover.style.position = "fixed";
      popover.style.top = below ? `${rect.bottom}px` : "";
      popover.style.bottom = below ? "" : `${window.innerHeight - rect.top}px`;
      popover.style.left = alignEnd ? "" : `${rect.left}px`;
      popover.style.right = alignEnd ? `${window.innerWidth - rect.right}px` : "";
    };

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, placement, popoverRef, triggerRef]);
}
```

- [ ] **Step 4: Wire it into Menu**

In `packages/react/src/Menu/Menu.tsx`, add `useId` to the existing React import and add the hook import:

```tsx
import { createContext, useCallback, useEffect, useId, useRef } from "react";
import { useMenuPlacement } from "./useMenuPlacement.js";
```

Inside the component, after the refs are declared:

```tsx
  const anchorName = `--psi-menu-${useId().replace(/:/g, "")}`;

  useMenuPlacement({ popoverRef, triggerRef, open, placement, anchorName });
```

- [ ] **Step 5: Append the anchor CSS**

Append to `packages/react/src/Menu/menu.module.css`:

```css
/* ── Placement (D53) ──────────────────────────────────────────────
   Above the anchor floor CSS does all the work. Below it, the hook in
   useMenuPlacement.ts sets inset directly; these rules are inert there
   because position-area needs an anchor to resolve against. */

@supports (anchor-name: --x) {
  .menu {
    position: fixed;
    margin: var(--psi-space-4);
    position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;
  }

  .menu[data-placement="bottom-start"] {
    position-area: block-end span-inline-end;
  }

  .menu[data-placement="bottom-end"] {
    position-area: block-end span-inline-start;
  }

  .menu[data-placement="top-start"] {
    position-area: block-start span-inline-end;
  }

  .menu[data-placement="top-end"] {
    position-area: block-start span-inline-start;
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm vitest run packages/react/src/Menu/
```

Expected: PASS, all Menu suites.

- [ ] **Step 7: Lint and commit**

```bash
pnpm lint
git add packages/react/src/Menu/
git commit -m "feat(react): Menu placement — anchor CSS with a gated JS fallback (D53)"
```

---

### Task 7: Public surface — exports, slot contracts, a11y metadata, docs

Without this task Menu exists but is invisible to the manifest, the MCP server, the generated docs and the D48 validator — which is the whole point of an agent-first system.

**Files:**
- Create: `packages/react/src/Menu/slots.json`
- Modify: `packages/react/src/index.ts` (exports)
- Modify: `packages/react/src/a11y-meta.ts` (three entries)
- Modify: `packages/react/src/a11y.axe.test.tsx` (import + cases)
- Modify: `packages/react/src/contracts.json` (add Menu to `interactive`)

**Interfaces:**
- Consumes: everything from Tasks 3–6.
- Produces: `Menu`, `MenuItem`, `MenuSeparator`, `MenuProps`, `MenuItemProps`, `Placement` exported from `@handamade/psi-react`; manifest entries with slots that Task 8's pattern references by name.

- [ ] **Step 1: Author the slot contract**

Create `packages/react/src/Menu/slots.json`:

```json
{
  "slots": [
    {
      "name": "items",
      "accepts": { "components": ["MenuItem", "MenuSeparator"] },
      "cardinality": "1..*",
      "order": 1
    }
  ]
}
```

- [ ] **Step 2: Declare the leaves**

Create `packages/react/src/Menu/MenuItem.slots.json` **only if** the manifest build expects a sibling file per component. Check first:

```bash
ls packages/react/src/Tag/
```

If `Tag` (a leaf) has no `slots.json`, leaves get `"slots": []` implicitly — create nothing and move on. If it does have one containing `{"slots": []}`, mirror that for `MenuItem` and `MenuSeparator`.

- [ ] **Step 3: Add the exports**

In `packages/react/src/index.ts`, following the existing export style, add:

```ts
export { Menu, MenuContext } from "./Menu/Menu.js";
export type { MenuProps, Placement } from "./Menu/Menu.js";
export { MenuItem } from "./Menu/MenuItem.js";
export type { MenuItemProps } from "./Menu/MenuItem.js";
export { MenuSeparator } from "./Menu/MenuSeparator.js";
```

- [ ] **Step 4: Add the a11y metadata**

In `packages/react/src/a11y-meta.ts`, add to `a11yMeta`:

```ts
  Menu: {
    keyboard: [
      { keys: "Arrow Down / Arrow Up", behavior: "Moves between enabled items, wrapping at both ends. Disabled items are skipped." },
      { keys: "Home / End", behavior: "Jumps to the first or last enabled item." },
      { keys: "A–Z / 0–9", behavior: "Typeahead — focuses the first enabled item whose label starts with the typed prefix; the prefix resets after 500ms." },
      { keys: "Esc", behavior: "Closes the menu and returns focus to the trigger." },
      { keys: "Enter / Space", behavior: "Activates the focused item (native button behavior)." },
    ],
    notes:
      "Opens on the native top layer via popover=\"auto\", which supplies light dismiss. Controlled-only: every dismissal path calls onClose(reason) and the consumer flips `open`. Requires an accessible name — pass aria-label. Placement uses CSS anchor positioning where supported and a JS fallback below that floor; below it there is no collision flip.",
  },
  MenuItem: {
    keyboard: [{ keys: "Enter / Space", behavior: "Activates; Menu then closes with reason \"item-select\"." }],
    notes:
      "Renders a real <button>. disabled sets aria-disabled (not the disabled attribute) so the item stays discoverable to assistive tech while being skipped by roving navigation. variant=\"danger\" is for destructive actions only.",
  },
  MenuSeparator: {
    keyboard: [],
    notes: "Decorative rule with role=\"separator\"; never focusable and skipped by roving navigation.",
  },
```

- [ ] **Step 5: Add axe cases**

In `packages/react/src/a11y.axe.test.tsx`, add `Menu, MenuItem, MenuSeparator` to the import list from `./index.js`, then add to `cases`:

```tsx
  ["Menu open", <Menu open onClose={() => {}} trigger={<Button size={32}>Actions</Button>} aria-label="Row actions"><MenuItem onSelect={() => {}}>Rename</MenuItem><MenuSeparator /><MenuItem onSelect={() => {}} variant="danger">Delete</MenuItem></Menu>],
  ["Menu with a disabled item", <Menu open onClose={() => {}} trigger={<Button size={32}>Actions</Button>} aria-label="Actions"><MenuItem onSelect={() => {}}>Rename</MenuItem><MenuItem onSelect={() => {}} disabled>Archive</MenuItem></Menu>],
```

- [ ] **Step 6: Add Menu to the interactive contract**

In `packages/react/src/contracts.json`, add `"Menu"` to the `interactive` set so slots elsewhere can accept it by capability:

```json
{
  "interactive": ["Button", "IconButton", "Menu"],
  "inline-content": ["Tag", "IconButton"]
}
```

- [ ] **Step 7: Rebuild and verify the manifest picked everything up**

```bash
pnpm build
node -e "const m=require('./packages/react/dist/manifest.json'); const n=m.components?m.components:m; console.log(Object.keys(n).filter(k=>k.startsWith('Menu')))"
```

Expected: `[ 'Menu', 'MenuItem', 'MenuSeparator' ]`. If the manifest is keyed differently, adjust the inspection command — the assertion is that all three appear.

- [ ] **Step 8: Run the full gate chain**

```bash
pnpm build && pnpm test && pnpm lint
```

Expected: all green. The docs-drift check runs inside `pnpm test`; if it fails it means generated docs need regenerating — follow the error's instructions rather than hand-editing anything under `dist`.

- [ ] **Step 9: Commit**

```bash
git add packages/react/src/
git commit -m "feat(react): export Menu, slot contracts, a11y metadata, axe cases (D53)"
```

---

### Task 8: `row-actions` pattern — the acceptance test

This is the cycle's machine-checkable exit condition, mirroring how `filter-toolbar` going live proved Toolbar.

**Files:**
- Create: `packages/react/patterns/row-actions.json`
- Test: the existing D48 pattern validator (runs in `pnpm build` / `pnpm test`)

**Interfaces:**
- Consumes: the manifest entries from Task 7; the existing `destructive-confirm` pattern id.
- Produces: a fourth entry in `patterns.json` with `gaps: []`.

- [ ] **Step 1: Read the schema and a live pattern**

```bash
cat packages/react/patterns/pattern.schema.json
cat packages/react/patterns/filter-toolbar.json
```

Every field used below must exist in the schema. If `pattern.schema.json` has `additionalProperties: false` at the root, do not invent fields.

- [ ] **Step 2: Author the pattern**

Create `packages/react/patterns/row-actions.json`:

```json
{
  "id": "row-actions",
  "intent": "List or table row with an overflow menu of per-row actions, including a destructive one",
  "match": ["row actions", "overflow menu", "kebab menu", "per-row actions", "table row menu"],
  "compose": {
    "component": "Menu",
    "props": { "placement": "{param:placement}" },
    "slots": {
      "items": [
        { "component": "MenuItem", "content": "edit-label" },
        { "component": "MenuItem", "content": "duplicate-label" },
        { "component": "MenuSeparator" },
        { "component": "MenuItem", "props": { "variant": "danger" }, "content": "delete-label" }
      ]
    }
  },
  "parameters": [
    {
      "key": "placement",
      "ask": "Which side should the menu open on?",
      "options": ["bottom-start", "bottom-end"],
      "default": "bottom-end"
    }
  ],
  "content": {
    "edit-label": "Edit",
    "duplicate-label": "Duplicate",
    "delete-label": "<verb the object>"
  },
  "gaps": []
}
```

- [ ] **Step 3: Run the validator**

```bash
pnpm build
```

Expected: exit 0. The D48 validator checks every `component` against the manifest and every prop against that component's declared props — so a typo in `variant` or a missing manifest entry fails here. If it reports an unknown component, Task 7 did not land correctly.

- [ ] **Step 4: Confirm the pattern count and that nothing is blocked**

```bash
node -e "const p=require('./packages/react/dist/patterns.json'); const list=Array.isArray(p)?p:p.patterns; console.log(list.length, list.map(x=>[x.id,x.gaps.length]))"
```

Expected: `4` patterns, every `gaps` length `0`.

- [ ] **Step 5: Note the destructive-confirm handoff in the intent**

The spec describes `row-actions` handing its destructive item off to `destructive-confirm`. Patterns do not compose each other structurally in the current schema, so express the relationship in prose the agent will read — confirm `intent` and `match` above already say "including a destructive one". If `pattern.schema.json` has an optional field for related patterns (check Step 1's output), add `"related": ["destructive-confirm"]`. If it does not, leave it — do not extend the schema for this.

- [ ] **Step 6: Commit**

```bash
git add packages/react/patterns/row-actions.json
git commit -m "feat(react): row-actions pattern — Menu's acceptance test (D53)"
```

---

### Task 9: Stories, VR baselines, changesets

**Files:**
- Create: `packages/react/src/Menu/Menu.stories.tsx`
- Create: `.changeset/menu-d53.md`

**Interfaces:**
- Consumes: everything above.
- Produces: VR coverage across the four themes and the release metadata.

- [ ] **Step 1: Read an existing stories file for the house format**

```bash
cat packages/react/src/Dialog/Dialog.stories.tsx
```

Match its meta shape, `tags`, and how it handles a controlled-open component in a story (Dialog has the same problem).

- [ ] **Step 2: Write the stories**

Create `packages/react/src/Menu/Menu.stories.tsx`. Every story renders with `open: true` — a closed menu captures nothing in VR. Adjust the `meta` block to match whatever `Dialog.stories.tsx` uses for `title` and `tags`; the stories themselves are:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Menu } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { MenuSeparator } from "./MenuSeparator.js";
import { Button } from "../Button/Button.js";
import type { Placement } from "./Menu.js";

const meta: Meta<typeof Menu> = {
  title: "Components/Menu",
  component: Menu,
};
export default meta;

type Story = StoryObj<typeof Menu>;

const items = (
  <>
    <MenuItem onSelect={() => {}}>Edit</MenuItem>
    <MenuItem onSelect={() => {}}>Duplicate</MenuItem>
    <MenuSeparator />
    <MenuItem onSelect={() => {}} variant="danger">Delete</MenuItem>
  </>
);

export const Default: Story = {
  args: { open: true, placement: "bottom-start", "aria-label": "Row actions" },
  render: (args) => (
    <Menu {...args} trigger={<Button size={32}>Actions</Button>}>{items}</Menu>
  ),
};

const placements: Placement[] = ["bottom-start", "bottom-end", "top-start", "top-end"];

export const Placements: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 120, gridTemplateColumns: "1fr 1fr", padding: 120 }}>
      {placements.map((placement) => (
        <Menu
          key={placement}
          open
          onClose={() => {}}
          placement={placement}
          aria-label={placement}
          trigger={<Button size={32}>{placement}</Button>}
        >
          {items}
        </Menu>
      ))}
    </div>
  ),
};

export const WithDisabledItem: Story = {
  args: { open: true, placement: "bottom-start", "aria-label": "Row actions" },
  render: (args) => (
    <Menu {...args} trigger={<Button size={32}>Actions</Button>}>
      <MenuItem onSelect={() => {}}>Edit</MenuItem>
      <MenuItem onSelect={() => {}} disabled>Archive</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => {}} variant="danger">Delete</MenuItem>
    </Menu>
  ),
};

/** Forces the sub-anchor-floor branch so VR captures the fallback placement
 * rather than trusting whatever the CI browser happens to support. */
export const FallbackPlacement: Story = {
  decorators: [
    (StoryFn) => {
      const original = CSS.supports.bind(CSS);
      CSS.supports = ((prop: string, value?: string) =>
        prop === "anchor-name" ? false : original(prop, value as string)) as typeof CSS.supports;
      return <StoryFn />;
    },
  ],
  args: { open: true, placement: "bottom-start", "aria-label": "Row actions" },
  render: (args) => (
    <Menu {...args} trigger={<Button size={32}>Actions</Button>}>{items}</Menu>
  ),
};
```

- [ ] **Step 3: Verify the stories build**

```bash
pnpm --filter ds-storybook build
```

Expected: "Storybook build completed successfully".

- [ ] **Step 4: Push and collect VR baselines from CI**

New stories have no committed baselines, so the VR job is *expected* to fail on this push. That failure is the mechanism, not a problem.

```bash
git add packages/react/src/Menu/Menu.stories.tsx
git commit -m "test(vr): Menu stories across placements, states and the fallback branch (D53)"
git push
```

Then: open the PR's failing VR job, download the `vr-baselines` artifact, unzip the new PNGs into the matching `*-snapshots/` directories under `apps/storybook/vr`, and commit them:

```bash
git add apps/storybook/vr
git commit -m "test(vr): commit Menu baselines from CI artifact (D53)"
```

Do **not** generate baselines locally — they are Linux-rendered and macOS output will not match.

- [ ] **Step 5: Write the changeset**

Create `.changeset/menu-d53.md`:

```markdown
---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

D53 — Menu, the overlay tier. `Menu` + `MenuItem` + `MenuSeparator` on the
native Popover API: `popover="auto"` supplies the top layer, light dismiss and
Esc; Psi supplies roving-tabindex keyboard navigation with typeahead, focus
return, and dismissal reasons via `onClose("esc" | "outside" | "item-select")`.
Controlled-only, like Dialog (D50). Zero new dependencies.

Placement is CSS anchor positioning above the anchor floor (Chrome 125+ /
Firefox 132+ / Safari 18.2+) and a `CSS.supports`-gated JS branch below it — a
top-layer element's containing block is the viewport, so the fallback cannot be
declarative. No collision flip below the anchor floor. Psi's documented browser
floor is unchanged.

New `--psi-menu-*` token family, pure indirection onto the D51 surface family,
so brands retuning `--psi-surface-*` get Menu for free. New `row-actions`
pattern takes the pattern index to four, all unblocked.
```

`psi-mcp` is `minor` here for the lockstep convention: it bakes its search index at build time from `react/dist/manifest.json` and `tokens/dist/*`, so three new components change its published artifact.

- [ ] **Step 6: Final gate chain**

```bash
pnpm build && pnpm test && pnpm lint
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add .changeset/menu-d53.md
git commit -m "chore: changeset for 0.8.0 (D53 Menu)"
```

---

## After the plan

Not part of the implementation, but scheduled by the spec:

1. **Release 0.8.0.** `pnpm release` needs Dmitry's interactive terminal — npm prompts for OTP and agent runs die with `ERR_PNPM_OTP_NON_INTERACTIVE`. Then `git push --tags`.
2. **Promo Playground demo** for Menu, following the HAN-42 precedent.
3. **Generation-eval rerun.** The harness cadence ("after any recipe/doc change") makes it due as soon as `patterns.json` changes, which Task 8 does.

## Out of scope

Submenus; checkable and radio menu items; a generic `Popover` primitive; Toolbar priority-plus collapse; migrating Tooltip onto the same anchor mechanism. All demand-driven and non-breaking to add later — see the spec's "Out of scope" section.
