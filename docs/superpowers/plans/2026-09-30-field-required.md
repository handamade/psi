# Field Required-Text and useFieldControl (D84) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Revised during Task 3.** The browser check showed the stand-in combobox had no accessible name: a `<label for>` names only a labelable element. The hook now also returns `aria-labelledby`, and `Field` gives its label an id. The stand-in also needed the shared focus ring (D82's sweep caught it), so it has a story-only stylesheet.

**Goal:** A `Field` can mark a required control with a word instead of an asterisk, and a control built outside Psi can take the Field's wiring through one hook.

**Architecture:** `Field` already provides `FieldContext` (`id`, `describedBy`, `invalid`, `required`) that `Input` and `Select` read. `useFieldControl` turns that context into spreadable props; `requiredText` is a second rendering of the existing `required` marker. One new token, one new pattern.

**Tech Stack:** React 19, CSS Modules, Vitest + Testing Library, the token build.

Spec: `docs/superpowers/specs/2026-09-30-field-required-design.md`.

## Global Constraints

- Node 24; check `node -v` first.
- Every default unchanged: without `requiredText` the asterisk renders as today; `Input` and `Select` are not modified.
- The hook returns `true`-or-absent flags, never `false`; `{}` outside a Field.
- `--psi-field-required-text-fg` binds `--psi-fg-secondary`, never `--psi-fg-tertiary`.
- Counts after: 35 components (a hook is not a component), **15 patterns**.
- Gates: `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site`, then `pnpm test:e2e`.
- Re-check D84 is free immediately before opening the PR.

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/tokens/src/components/field.ts` | `required-text-fg` |
| `packages/react/src/Field/Field.tsx`, `field.module.css` | `requiredText` |
| `packages/react/src/Field/useFieldControl.ts` (new) | the hook |
| `packages/react/src/index.ts` | exports |
| `packages/react/src/Field/Field.stories.tsx`, `a11y.axe.test.tsx`, `a11y-meta.ts` | stories, axe, docs |
| `packages/react/patterns/required-field.json` (new) | the pattern |
| `packages/react/llms.txt`, `packages/mcp/README.md`, `packages/mcp/llms.txt` | prose and counts |
| `.changeset/field-required.md` (new) | `minor` |

---

### Task 1: The token and `requiredText`

- [ ] **Step 1: Failing tests.** In `packages/tokens/__tests__/field-tokens.test.ts` add `"required-text-fg": "var(--psi-fg-secondary)",` after `"marker-fg"` in the `toEqual` object and rename the test to "six". In `Field.test.tsx`:

```tsx
describe("requiredText (D84)", () => {
  it("shows the word instead of the asterisk, hidden from assistive tech", () => {
    const { container } = render(
      <Field label="Name" required requiredText="(Required)">
        <Input />
      </Field>,
    );
    const label = container.querySelector("label")!;
    expect(label).toHaveTextContent("Name (Required)");
    expect(label).not.toHaveTextContent("*");
    expect(within(label).getByText("(Required)")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("input")).toBeRequired();
  });

  it("renders nothing when the field is not required", () => {
    const { container } = render(
      <Field label="Name" requiredText="(Required)">
        <Input />
      </Field>,
    );
    expect(container.querySelector("label")).toHaveTextContent(/^Name$/);
  });
});
```

- [ ] **Step 2: Run red** — `pnpm vitest run packages/tokens/__tests__/field-tokens.test.ts packages/react/src/Field`.
- [ ] **Step 3: Implement.** Token: `"required-text-fg": "var(--psi-fg-secondary)",` with a comment on why not marker-fg or fg-tertiary. CSS: `.requiredText { font: var(--psi-text-14-20-regular); color: var(--psi-field-required-text-fg); }`. `Field.tsx`: add `requiredText?: string` with JSDoc; in `labelContent`, when `required`, render `requiredText !== undefined ? <span aria-hidden="true" className={styles.requiredText}>{" "}{requiredText}</span> : <span aria-hidden="true" className={styles.marker}>{" *"}</span>`.
- [ ] **Step 4: Run green**, then `pnpm --filter @handamade/psi-tokens build` (scope and contrast gates).
- [ ] **Step 5: Commit** — `feat: Field requiredText, in the label's colour (D84)`

### Task 2: `useFieldControl`

- [ ] **Step 1: Failing test** — `packages/react/src/Field/useFieldControl.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field } from "./Field.js";
import { useFieldControl } from "./useFieldControl.js";

/** A control Psi did not write: a combobox-shaped div. */
function Custom() {
  const props = useFieldControl();
  return <div role="combobox" tabIndex={0} aria-expanded="false" data-testid="custom" {...props} />;
}

describe("useFieldControl (D84)", () => {
  it("returns the Field's wiring as spreadable props", () => {
    render(
      <Field label="Airline" error="Pick one." required>
        <Custom />
      </Field>,
    );
    const el = screen.getByTestId("custom");
    expect(screen.getByText("Airline")).toHaveAttribute("for", el.id);
    expect(el).toHaveAttribute("aria-describedby", screen.getByText("Pick one.").id);
    expect(el).toHaveAttribute("aria-invalid", "true");
    expect(el).toHaveAttribute("aria-required", "true");
    expect(el).toHaveAttribute("required");
  });

  it("omits the flags a Field does not set, rather than writing false", () => {
    render(
      <Field label="Airline" description="Optional.">
        <Custom />
      </Field>,
    );
    const el = screen.getByTestId("custom");
    expect(el).toHaveAttribute("aria-describedby");
    expect(el).not.toHaveAttribute("aria-invalid");
    expect(el).not.toHaveAttribute("aria-required");
    expect(el).not.toHaveAttribute("required");
  });

  it("returns an empty object outside a Field", () => {
    let seen: unknown;
    function Probe() { seen = useFieldControl(); return null; }
    render(<Probe />);
    expect(seen).toEqual({});
  });
});
```

- [ ] **Step 2: Run red** (missing module).
- [ ] **Step 3: Implement** `useFieldControl.ts`:

```ts
import { useContext } from "react";
import { FieldContext } from "./Field.js";

/** What a control spreads onto its focusable element to join a Field. */
export interface FieldControlProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
  required?: true;
}

/** The wiring a Field gives its control, for a control Psi did not write (D84). ... */
export function useFieldControl(): FieldControlProps {
  const field = useContext(FieldContext);
  if (!field) return {};
  return {
    id: field.id,
    ...(field.describedBy ? { "aria-describedby": field.describedBy } : {}),
    ...(field.invalid ? { "aria-invalid": true as const } : {}),
    ...(field.required ? { "aria-required": true as const, required: true as const } : {}),
  };
}
```

Export `useFieldControl`, `FieldControlProps`, `FieldContext`, `FieldContextValue` from `index.ts`.

- [ ] **Step 4: Run green.** **Step 5: Commit** — `feat(react): useFieldControl, and FieldContext exported (D84)`

### Task 3: Docs, story, axe, pattern, counts, changeset

- [ ] **Step 1:** `a11y-meta.ts` Field notes: `requiredText`, and the hook for custom controls. `llms.txt`: the Field section gains both. `docs/Field.md` regenerates on build.
- [ ] **Step 2:** Stories: `RequiredText` (a required Input with `requiredText="(Required)"` above a required one with the asterisk) and `CustomControl` (a `role="combobox"` div using the hook, with an error). Axe cases for both.
- [ ] **Step 3:** Pattern `required-field.json`:

```json
{
  "id": "required-field",
  "intent": "A required field that says so in text, not by a glyph alone: a Field with required and requiredText around an Input, with a description",
  "match": ["required field", "mandatory field", "required in text", "required label", "(Required)"],
  "compose": {
    "component": "Field",
    "props": { "required": true, "requiredText": "{content:required-text}" },
    "slots": {
      "label": ["{content:label}"],
      "body": [{ "component": "Input", "props": { "size": "{param:size}" } }],
      "description": ["{content:description}"]
    }
  },
  "parameters": [{ "key": "size", "ask": "Control size?", "options": [32, 40], "default": 32 }],
  "content": { "label": "[field name]", "required-text": "(Required)", "description": "[why it is needed]" },
  "gaps": []
}
```

Add `"required-field"` to the id lists in `seed-patterns.test.ts` and `emit-patterns.test.ts` (fifteen).

- [ ] **Step 4:** Counts 14 → 15 in `packages/react/llms.txt`, `packages/mcp/README.md`, `packages/mcp/llms.txt`. Changeset `minor`.
- [ ] **Step 5:** `pnpm build`, the five gates, `pnpm test:e2e`; add regenerated docs and `Presets.stories.tsx`.
- [ ] **Step 6:** Look at the story and preset in a browser, light and ember. Fill in the spec. Commit.
- [ ] **Step 7:** Re-check D84 is free; push; PR; arm auto-merge and read it back; stop for review. New baselines: two stories and one preset, in two themes.
