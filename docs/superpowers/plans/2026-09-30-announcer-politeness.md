# Announcements by Politeness (D83) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The owner of an announcement chooses its politeness, can localise or drop Toast's status word, and can announce text with no visible card, all through the one `ToastRegion`.

**Architecture:** `ToastRegion` already routes children into two always-present live wrappers by reading a prop off each child element. It gains a second thing to read (`politeness`) and a second child type to recognise (`Announcement`), and spreads its rest props. `Toast` and `Announcement` stay presentational: neither renders a live region.

**Tech Stack:** React 19 (ref-as-prop), CSS Modules, Vitest + Testing Library (jsdom), Playwright `@interaction` specs over built Storybook.

Spec: `docs/superpowers/specs/2026-09-30-announcer-politeness-design.md`.

## Global Constraints

- Node 24; check `node -v` first.
- Every default unchanged: with no new prop, routing, status word and DOM are as today. Existing Toast tests must pass **unedited**.
- `Announcement` renders no `role`, no `aria-live`, no icon, takes no `className`.
- No `style` prop, no `url()`, no HTML sink, no runtime dependency.
- Exactly two live regions in a `ToastRegion`, whatever it holds.
- Counts after this change: **35 components, 14 patterns**. Update every prose count `tools/check-docs-drift.mjs` reads.
- Gates, from the repo root: `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site`, then `pnpm test:e2e`. `pnpm vr` only passes in CI.
- `pnpm --filter <pkg> test` runs nothing. Use `pnpm vitest run <path>`.
- Re-check D83 is free immediately before opening the PR.

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/react/src/Toast/Toast.tsx` | `politeness`, `statusLabel` |
| `packages/react/src/Toast/Announcement.tsx` (new) | the speech-only child |
| `packages/react/src/Toast/ToastRegion.tsx` | routing by politeness; rest spread |
| `packages/react/src/Toast/useToast.ts`, `ToastProvider.tsx` | `show({ politeness, statusLabel })` |
| `packages/react/src/index.ts`, `scripts/emit-manifest.ts`, `src/a11y-meta.ts` | registration |
| `packages/react/src/Toast/Toast.stories.tsx` | two stories |
| `packages/react/src/a11y.axe.test.tsx` | axe cases |
| `apps/storybook/vr/toast.interaction.spec.ts` | browser truth for `Announcement` |
| `packages/react/patterns/announcer.json` (new) | the pattern |
| `README.md`, `packages/react/README.md`, `packages/react/llms.txt`, `packages/mcp/README.md`, `packages/mcp/llms.txt` | counts and prose |
| `.changeset/announcer-politeness.md` (new) | `minor` |

---

### Task 1: `statusLabel` and `politeness` on Toast

**Files:** Modify `packages/react/src/Toast/Toast.tsx`; test `Toast.test.tsx`.

**Interfaces:** Produces `export type ToastPoliteness = "polite" | "assertive"` and, on `ToastProps`, `politeness?: ToastPoliteness` and `statusLabel?: string | null`.

- [ ] **Step 1: Failing tests** — append to `describe("Toast")`:

```tsx
describe("statusLabel (D83)", () => {
  it("replaces the status word", () => {
    render(<Toast variant="danger" statusLabel="Fehler:">Nicht gespeichert</Toast>);
    expect(screen.getByText("Fehler:").className).toContain("psi-sr-only");
    expect(screen.queryByText("Error:")).toBeNull();
  });

  it("null drops the status word", () => {
    const { container } = render(<Toast variant="danger" statusLabel={null}>Not saved</Toast>);
    expect(screen.queryByText("Error:")).toBeNull();
    expect(container.querySelector(".psi-sr-only")).toBeNull();
  });

  it("gives a neutral toast a word when one is passed", () => {
    render(<Toast statusLabel="Note:">Export queued</Toast>);
    expect(screen.getByText("Note:")).toBeInTheDocument();
  });
});

describe("politeness (D83)", () => {
  it("is read by ToastRegion and renders nothing on the toast itself", () => {
    const { container } = render(<Toast variant="success" politeness="assertive">Accepted</Toast>);
    const el = container.firstChild as HTMLElement;
    expect(el).not.toHaveAttribute("politeness");
    expect(el).not.toHaveAttribute("role");
    expect(el).not.toHaveAttribute("aria-live");
  });
});
```

- [ ] **Step 2: Run red** — `pnpm vitest run packages/react/src/Toast/Toast.test.tsx`. Expected: the three `statusLabel` tests fail on assertion. (The `politeness` test passes already: React does not forward an undestructured prop here. It pins the contract.)
- [ ] **Step 3: Implement** — add the type and props with JSDoc, destructure `statusLabel` (leave `politeness` undestructured and unused: the region reads it off the element), and resolve the word with `const prefix = statusLabel === undefined ? statusPrefix[variant] : statusLabel;`.
- [ ] **Step 4: Run green**, the whole `Toast/` folder.
- [ ] **Step 5: Commit** — `feat(react): Toast takes statusLabel and politeness (D83)`

### Task 2: `Announcement`, routing, and the region's rest props

**Files:** Create `Toast/Announcement.tsx`, `Toast/Announcement.test.tsx`; modify `Toast/ToastRegion.tsx`, `ToastRegion.test.tsx`.

**Interfaces:**
- Consumes `ToastPoliteness` from Task 1.
- Produces `Announcement({ politeness = "polite", children })` rendering `<div className="psi-sr-only" data-psi-announcement>`; `ToastRegionProps extends Omit<HTMLAttributes<HTMLDivElement>, "children">`.

- [ ] **Step 1: Failing tests** — `Announcement.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Announcement } from "./Announcement.js";

describe("Announcement (D83)", () => {
  it("renders its text, visually hidden", () => {
    render(<Announcement>Row 12 updated</Announcement>);
    expect(screen.getByText("Row 12 updated").className).toBe("psi-sr-only");
  });

  it("is not a live region, and carries no role and no icon", () => {
    const { container } = render(<Announcement politeness="assertive">Accepted</Announcement>);
    const el = container.firstChild as HTMLElement;
    expect(el).not.toHaveAttribute("role");
    expect(el).not.toHaveAttribute("aria-live");
    expect(el).not.toHaveAttribute("politeness");
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelectorAll("[aria-live], [role]")).toHaveLength(0);
  });
});
```

and append to `describe("ToastRegion")`:

```tsx
describe("routing by politeness (D83)", () => {
  it("sends an assertive success toast to the alert wrapper", () => {
    render(
      <ToastRegion>
        <Toast variant="success" politeness="assertive">accepted</Toast>
      </ToastRegion>,
    );
    expect(within(assertive()).getByText("accepted")).toBeInTheDocument();
    expect(polite()).toBeEmptyDOMElement();
  });

  it("sends a polite danger toast to the status wrapper", () => {
    render(
      <ToastRegion>
        <Toast variant="danger" politeness="polite">link lost</Toast>
      </ToastRegion>,
    );
    expect(within(polite()).getByText("link lost")).toBeInTheDocument();
    expect(assertive()).toBeEmptyDOMElement();
  });

  it.each(["polite", "assertive"] as const)("routes a %s Announcement to its wrapper", (politeness) => {
    render(
      <ToastRegion>
        <Announcement politeness={politeness}>spoken</Announcement>
      </ToastRegion>,
    );
    const [home, other] = politeness === "polite" ? [polite(), assertive()] : [assertive(), polite()];
    expect(within(home).getByText("spoken")).toBeInTheDocument();
    expect(other).toBeEmptyDOMElement();
  });

  it("treats an Announcement with no politeness as polite", () => {
    render(
      <ToastRegion>
        <Announcement>spoken</Announcement>
      </ToastRegion>,
    );
    expect(within(polite()).getByText("spoken")).toBeInTheDocument();
  });

  it("still holds exactly two live regions, whatever it is given", () => {
    const { container } = render(
      <ToastRegion>
        <Toast variant="success" politeness="assertive">accepted</Toast>
        <Toast variant="danger">failed</Toast>
        <Announcement>row updated</Announcement>
        <Announcement politeness="assertive">2 fields need attention</Announcement>
      </ToastRegion>,
    );
    expect(container.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]')).toHaveLength(2);
  });
});

describe("rest props (D83)", () => {
  it("puts data-* and other HTML attributes on the root", () => {
    const { container } = render(
      <ToastRegion data-react-aria-top-layer="" id="announcer">{null}</ToastRegion>,
    );
    expect(container.firstChild).toHaveAttribute("data-react-aria-top-layer");
    expect(container.firstChild).toHaveAttribute("id", "announcer");
  });

  it("does not let a passed attribute displace its own", () => {
    const hostile = { popover: "auto", "data-placement": "nowhere", "data-psi-toast-region": "no" } as object;
    const { container } = render(<ToastRegion {...hostile}>{null}</ToastRegion>);
    expect(container.firstChild).toHaveAttribute("popover", "manual");
    expect(container.firstChild).toHaveAttribute("data-placement", "bottom-end");
    expect(container.firstChild).toHaveAttribute("data-psi-toast-region", "true");
  });
});
```

(import `Announcement` at the top of `ToastRegion.test.tsx`).

- [ ] **Step 2: Run red** — `pnpm vitest run packages/react/src/Toast`. Expected: `Announcement.test.tsx` fails to resolve the module; in `ToastRegion.test.tsx` the two Toast routing tests, the assertive Announcement test and the `data-*` test fail on assertion.
- [ ] **Step 3: Implement `Announcement.tsx`:**

```tsx
import type { ReactNode } from "react";
import type { ToastPoliteness } from "./Toast.js";

export interface AnnouncementProps {
  /** Which of ToastRegion's two live wrappers speaks it. @default "polite" */
  politeness?: ToastPoliteness;
  /** The text to announce. */
  children: ReactNode;
}

/** Text for a screen reader only, spoken through ToastRegion (D83).
 *
 * **It is not a live region.** It renders no `role` and no `aria-live`, and
 * outside a ToastRegion it announces nothing — the region's two persistent
 * wrappers are the only live regions, and an Announcement is content for one
 * of them. Do not use it as a second announcer.
 *
 * Use it where an event must be spoken and there is nothing to show: a state
 * change of the object on screen, or field errors the form already displays.
 *
 * Controlled, like Toast: it holds no state and never removes itself. Remove
 * it once it has been spoken. To announce the same text again, remove it and
 * render it again with a new `key` — a live region speaks changes, and an
 * unchanged node is not one. */
export function Announcement({ children }: AnnouncementProps) {
  return (
    <div className="psi-sr-only" data-psi-announcement>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Implement routing and rest props in `ToastRegion.tsx`:**

```tsx
export interface ToastRegionProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> { /* own props unchanged */ }

/** True when this child belongs in the assertive wrapper. A Toast or an
 * Announcement that names its `politeness` decides for itself (D83); a Toast
 * that does not falls back to its variant (D64). Anything else is polite —
 * the region must not throw on unexpected children. */
function isAssertive(child: ReactNode): boolean {
  if (!isValidElement(child)) return false;
  if (child.type !== Toast && child.type !== Announcement) return false;
  const { politeness, variant } = child.props as { politeness?: ToastPoliteness; variant?: ToastVariant };
  if (politeness !== undefined) return politeness === "assertive";
  return child.type === Toast && ASSERTIVE.has(variant ?? "neutral");
}
```

Destructure `...rest` and spread it as the **first** attribute of the root `<div>`, before `ref`, `popover`, `aria-label`, `data-placement`, `data-psi-toast-region` and `className`.

- [ ] **Step 5: Run green** — `pnpm vitest run packages/react/src/Toast`.
- [ ] **Step 6: Commit** — `feat(react): Announcement, routing by politeness, ToastRegion rest props (D83)`

### Task 3: `show({ politeness, statusLabel })`

**Files:** Modify `Toast/useToast.ts`, `Toast/ToastProvider.tsx`; test `ToastProvider.test.tsx`.

- [ ] **Step 1: Failing tests**, following the file's existing harness for raising a toast:
  - `show({ variant: "success", message: "Accepted", politeness: "assertive" })` lands in the `role="alert"` wrapper;
  - `show({ variant: "danger", message: "Nicht gespeichert", statusLabel: "Fehler:" })` renders *Fehler:* and not *Error:*;
  - `show({ variant: "danger", message: "x", statusLabel: null })` renders no status word.
- [ ] **Step 2: Run red**, on assertion.
- [ ] **Step 3: Implement** — add both fields, with JSDoc, to `ToastOptions` and `QueuedToast`; carry them through `show`; pass them to `<Toast>`. `statusLabel` must stay `undefined` when not given, so the default word survives.
- [ ] **Step 4: Run green.** **Step 5: Commit** — `feat(react): useToast().show accepts politeness and statusLabel (D83)`

### Task 4: Registration, stories, axe, browser truth

**Files:** `src/index.ts`, `scripts/emit-manifest.ts`, `src/a11y-meta.ts`, `src/a11y.axe.test.tsx`, `Toast/Toast.stories.tsx`, `apps/storybook/vr/toast.interaction.spec.ts`.

- [ ] **Step 1:** Export `Announcement`, `AnnouncementProps` and `ToastPoliteness` from `index.ts`. Add `"Announcement"` to `COMPONENTS` after `"ToastProvider"` and `Announcement: "Toast"` to `COMPONENT_DIR`.
- [ ] **Step 2:** `a11y-meta.ts` — an `Announcement` entry (no keyboard rows; notes: not a live region, belongs inside the one `ToastRegion`, owner disposes, re-announce with a new `key`). Update the `Toast` notes for `statusLabel` and the `ToastRegion` notes for routing by `politeness` and the rest props.
- [ ] **Step 3:** axe cases: an assertive success toast; a region holding one toast and two announcements.
- [ ] **Step 4:** Stories, in `Toast.stories.tsx`: `AssertiveSuccess` (a success toast with `politeness="assertive"` beside a polite one, in a region) and `WithAnnouncements` (one visible toast and two `Announcement`s in a region). Each is a VR baseline; the second must look like a region with one toast.
- [ ] **Step 5:** Browser test, appended to `toast.interaction.spec.ts`, against `WithAnnouncements`: each announcement is inside the wrapper its politeness names, measures at most 1 × 1 px, and the region is no taller than the same region with the announcements removed would be (compare against the single toast's box plus the region's padding).
- [ ] **Step 6:** `pnpm build`, then `pnpm vitest run packages/react` and `pnpm test:e2e`. `git status` for `packages/react/docs/Announcement.md` and the regenerated Toast docs; add them.
- [ ] **Step 7: Commit** — `feat(react): register Announcement; stories, axe and browser tests (D83)`

### Task 5: The `announcer` pattern and the counts

**Files:** Create `packages/react/patterns/announcer.json`; modify `scripts/seed-patterns.test.ts` and every count.

- [ ] **Step 1: Failing test** — in `seed-patterns.test.ts`, add `"announcer"` to the sorted id list (between `action-feedback` and `bulk-action-bar`) and rename the test to "all fourteen". Run red.
- [ ] **Step 2: The pattern:**

```json
{
  "id": "announcer",
  "intent": "One announcer for a whole application: a single ToastRegion holding visible toasts and speech-only Announcements, each routed by politeness rather than by tone. For an application that owns exactly two live regions and lets nothing else write one. For a single confirmation toast, use action-feedback.",
  "match": ["announcer", "live region", "screen reader announcement", "aria-live", "status message", "announce without a toast", "polite and assertive"],
  "compose": {
    "component": "ToastRegion",
    "slots": {
      "body": [
        {
          "component": "Toast",
          "props": { "variant": "success", "politeness": "{param:outcome-politeness}" },
          "slots": { "body": ["{content:outcome}"] }
        },
        { "component": "Announcement", "props": { "politeness": "polite" }, "slots": { "body": ["{content:state-change}"] } },
        { "component": "Announcement", "props": { "politeness": "assertive" }, "slots": { "body": ["{content:field-errors}"] } }
      ]
    }
  },
  "parameters": [
    {
      "key": "outcome-politeness",
      "ask": "Should the outcome of the user's own action interrupt, success included?",
      "options": ["assertive", "polite"],
      "default": "assertive"
    }
  ],
  "content": {
    "outcome": "[the outcome of the action the user just took]",
    "state-change": "[a change to the object on screen, spoken and not shown]",
    "field-errors": "[how many fields need attention, spoken after a failed submission]"
  },
  "gaps": []
}
```

- [ ] **Step 3:** `pnpm build` (regenerates `dist/patterns.json` and `Presets.stories.tsx`), run the pattern tests green, `git add` the regenerated story file.
- [ ] **Step 4: Counts** — 34 → 35 components in `README.md`, `packages/react/README.md`, `packages/react/llms.txt`, `packages/mcp/README.md`; 13 → 14 patterns in `packages/react/llms.txt`, `packages/mcp/README.md`, `packages/mcp/llms.txt`. `node tools/check-docs-drift.mjs` must pass.
- [ ] **Step 5: `packages/react/llms.txt`** — the Toast family heading becomes `(4)`; rewrite the `Toast` and `ToastRegion` lines for the new props; add an `Announcement` line that opens with "not a live region".
- [ ] **Step 6: Changeset** `.changeset/announcer-politeness.md`, `minor` for tokens and react.
- [ ] **Step 7: Commit** — `feat(react): the announcer pattern; 35 components, 14 patterns (D83)`

### Task 6: Gates, spec, PR, baselines

- [ ] **Step 1:** The five gates, then `pnpm test:e2e`.
- [ ] **Step 2:** Look at the two new stories and the `announcer` preset in a browser, light and ember.
- [ ] **Step 3:** Fill in the spec's Verification and Consequences; status to Implemented. Commit.
- [ ] **Step 4:** Re-check D83 is free. Push, open the PR, arm auto-merge and read it back.
- [ ] **Step 5:** Stop for review. The new stories have no baselines, so `vr` fails by design until they are taken from the CI artifact.
