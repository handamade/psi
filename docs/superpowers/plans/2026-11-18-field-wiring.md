# Field wiring (D135) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inside a `Field`, the Field's wiring wins over a caller's props. `Checkbox` and `Switch` take that wiring in a non-group Field. `--psi-toolbar-control-width` reaches the control of a top-labelled Field in a `Toolbar`.

**Architecture:** One internal hook, `useFieldWiring`, computes `id`, `required`, `aria-invalid` and `aria-describedby` for every native control Psi writes. Each control spreads the caller's props first and the hook's result after. `Field` marks its root with `data-psi-field`. `Toolbar`'s CSS module reaches a top-labelled Field's `input`, `select` or `[data-psi-combobox]` child.

**Tech Stack:** React 19, CSS Modules, Vitest + Testing Library (jsdom), Playwright (Chromium) interaction specs over the built Storybook.

Spec: `docs/superpowers/specs/2026-11-18-field-wiring-design.md`.

## Global Constraints

- Node 24: `node -v` before the first pnpm command.
- Never hardcode colours in component CSS; bind `var(--psi-*)`.
- Do not touch `packages/react/src/Combobox/*` (D134), `Dialog` or `Toast` (D136).
- Every user-visible change carries a changeset. Packages are versioned in lockstep.
- Gates: `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && CI=1 pnpm test:site`.
- Interaction specs run with `CI=1 npx playwright test -c apps/storybook/vr <file>` after `pnpm build` (`CI=1` so a server on 6208 from another checkout is not reused). `pnpm vr` screenshots pass only in CI.
- Never name the register, a request id or a consumer in repo files, commits or the PR.

---

### Task 1: `useFieldWiring`, and the Field's wiring wins in `Input`, `Select`, `Textarea` (P21)

**Files:**
- Create: `packages/react/src/Field/useFieldWiring.ts`
- Modify: `packages/react/src/Input/Input.tsx`, `packages/react/src/Select/Select.tsx`, `packages/react/src/Textarea/Textarea.tsx`, `packages/react/src/Field/Field.tsx` (the `htmlFor` doc)
- Test: `packages/react/src/Field/Field.test.tsx`

**Interfaces:**
- Produces: `useFieldWiring(component: string, own: OwnWiring, options?: { choice?: boolean; describedBy?: string }): OwnWiring`. Here `OwnWiring = { id?: string; required?: boolean; "aria-invalid"?: AriaAttributes["aria-invalid"]; "aria-describedby"?: string }`. It is internal and not exported from `index.ts`.

- [ ] **Step 1: Write the failing tests** (append to `Field.test.tsx`; add `Textarea` and `vi` imports)

```tsx
describe("the Field's wiring wins (D135)", () => {
  const controls = {
    Input: () => <Input id="own" aria-invalid={false} required={false} />,
    Select: () => <Select id="own" aria-invalid={false} required={false}><option>a</option></Select>,
    Textarea: () => <Textarea id="own" aria-invalid={false} required={false} />,
  };
  for (const [name, Control] of Object.entries(controls)) {
    it(`${name} takes the Field's id, aria-invalid and required over the caller's`, () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(<Field label="Email" error="Not an address." required><Control /></Field>);
      const el = screen.getByLabelText(/Email/);
      expect(el.id).not.toBe("own");
      expect(el).toHaveAttribute("aria-invalid", "true");
      expect(el).toBeRequired();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]![0])).toMatch(new RegExp(`^${name}: .*htmlFor="own"`));
      warn.mockRestore();
    });
  }

  it("keeps a caller's aria-invalid and required while the Field sets neither", () => {
    render(<Field label="Nick"><Input aria-invalid required /></Field>);
    const input = screen.getByLabelText("Nick");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toBeRequired();
  });

  it("htmlFor names the id, and a matching caller id does not warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Field label="Email" htmlFor="email"><Input id="email" /></Field>);
    expect(screen.getByLabelText("Email").id).toBe("email");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("outside a Field the caller's props pass through", () => {
    render(<Input aria-label="Solo" id="own" aria-invalid={false} required={false} />);
    const input = screen.getByLabelText("Solo");
    expect(input.id).toBe("own");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).not.toBeRequired();
  });
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run packages/react/src/Field/Field.test.tsx`. The id is `"own"`, `aria-invalid` is `"false"`, and nothing warns.

- [ ] **Step 3: Write the hook**

```ts
import { useContext, useEffect } from "react";
import type { AriaAttributes } from "react";
import { FieldContext } from "./Field.js";

/** The props a Field and a caller both set on a control. */
export interface OwnWiring {
  id?: string;
  required?: boolean;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
  "aria-describedby"?: string;
}

/** What a native control Psi writes puts on its element inside a Field (D135).
 * The Field's wiring wins: its id (the one its <label for> points at), `true`
 * for aria-invalid while it has an error and for required while it is
 * required. A caller adds to it and never undoes it: their aria-invalid or
 * required stands while the Field sets neither, and their aria-describedby
 * joins the Field's message (then `describedBy`, a Textarea's counter).
 * A choice control (Checkbox, Switch) in a group Field takes aria-invalid
 * only: the group's fieldset holds the label and the message, and `required`
 * on a box means that box must be ticked (D108). Outside a Field the caller's
 * values pass through. Spread it after the caller's props. */
export function useFieldWiring(
  component: string,
  own: OwnWiring,
  options: { choice?: boolean; describedBy?: string } = {},
): OwnWiring {
  const field = useContext(FieldContext);
  const wired = field != null && !(options.choice && field.group);
  const fieldId = wired ? field.id : undefined;
  const ownId = own.id;

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (fieldId === undefined || ownId === undefined || ownId === fieldId) return;
    console.warn(
      `${component}: inside a Field the control takes the Field's id, so id="${ownId}" was not used. Set it on the Field instead: <Field htmlFor="${ownId}">.`,
    );
  }, [component, fieldId, ownId]);

  const describedBy =
    [wired ? field.describedBy : undefined, options.describedBy, own["aria-describedby"]]
      .filter(Boolean)
      .join(" ") || undefined;

  return {
    id: fieldId ?? own.id,
    required: wired && field.required ? true : own.required,
    "aria-invalid": field?.invalid ? true : own["aria-invalid"],
    "aria-describedby": describedBy,
  };
}
```

- [ ] **Step 4: Use it in the three controls.** `Input`:

```tsx
export function Input({ size = 32, error = false, type = "text", className, ref, ...rest }: InputProps) {
  const field = useContext(FieldContext);
  const wiring = useFieldWiring("Input", rest);
  const invalid = error || (field?.invalid ?? false);
  // … cls unchanged …
  return <input ref={ref} className={cls} type={type} {...rest} {...wiring} />;
}
```

`Select` is the same, with `useFieldWiring("Select", rest)` and `<select ref={ref} className={cls} {...rest} {...wiring}>{children}</select>`.

`Textarea`: `const wiring = useFieldWiring("Textarea", rest, { describedBy: counter ? counterId : undefined });`. Then `<textarea ref={ref} className={cls} rows={rows} maxLength={maxLength} {...rest} {...wiring} onChange={handleChange} />`.

Update each component's doc line: "Inside a Field, id/aria-describedby/aria-invalid/required are wired automatically (D49), and the Field's win over the caller's (D135)." `Field`'s `htmlFor` doc: "The control's id. The control takes it and ignores an id of its own (D135), so set a known id here rather than on the control."

- [ ] **Step 5: Run, expect PASS** — `npx vitest run packages/react/src` (the whole package: the old wiring tests must still pass).

- [ ] **Step 6: Commit** — `feat(react): inside a Field the Field's id, aria-invalid and required win (D135)`.

### Task 2: `Checkbox` and `Switch` take a non-group Field's wiring (P137)

**Files:**
- Modify: `packages/react/src/Checkbox/Checkbox.tsx`, `packages/react/src/Switch/Switch.tsx`, `Checkbox.stories.tsx`, `Switch.stories.tsx`, `packages/react/src/a11y.axe.test.tsx`
- Test: `Checkbox.test.tsx`, `Switch.test.tsx`
- Create: `apps/storybook/vr/field-wiring.interaction.spec.ts`

**Interfaces:**
- Consumes: `useFieldWiring(component, own, { choice: true })` from Task 1.

- [ ] **Step 1: Failing tests.** In `Checkbox.test.tsx`, replace D108's "keeps an aria-invalid the consumer passes" with:

```tsx
  it("the group Field's aria-invalid beats the consumer's false (D135 reverses D108 here)", () => {
    group("Pick at least one.", { "aria-invalid": false });
    expect(screen.getByRole("checkbox", { name: "Email" })).toHaveAttribute("aria-invalid", "true");
  });
```

Then add (the same block in `Switch.test.tsx`, with `Switch` and role `switch`):

```tsx
describe("Checkbox in a Field that is not a group (D135)", () => {
  it("is named by the Field's label and its own, described by the message, invalid and required", () => {
    render(<Field label="Notifications" error="Choose one." required><Checkbox>Email me weekly</Checkbox></Field>);
    const box = screen.getByRole("checkbox", { name: /^Notifications.*Email me weekly$/ });
    expect(box).toHaveAttribute("aria-describedby", screen.getByText("Choose one.").id);
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toBeRequired();
  });

  it("without a Field label keeps its own name and still takes the message", () => {
    render(<Field error="You must accept the terms."><Checkbox>I accept the terms</Checkbox></Field>);
    const box = screen.getByRole("checkbox", { name: "I accept the terms" });
    expect(box).toHaveAccessibleDescription("You must accept the terms.");
  });

  it("in a valid Field is neither invalid nor required", () => {
    render(<Field label="Notifications" description="Weekly."><Checkbox>Email me weekly</Checkbox></Field>);
    const box = screen.getByRole("checkbox");
    expect(box).not.toHaveAttribute("aria-invalid");
    expect(box).not.toBeRequired();
  });
});
```

`Switch.test.tsx` also gets the group case: in `<Field group label="Alerts" error="Pick one." required>` a `Switch` is `aria-invalid="true"` and not required.

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run packages/react/src/Checkbox packages/react/src/Switch`.

- [ ] **Step 3: Implement.** `Checkbox`: delete `useContext(FieldContext)` and `fieldInvalid`. Add `const wiring = useFieldWiring("Checkbox", rest, { choice: true });`. Render `<input ref={setRef} type="checkbox" className={…} disabled={disabled} {...rest} {...wiring} />`. Rewrite the comment and the docblock: "In a Field it takes the Field's id, message, aria-invalid and required (D135); in a group Field only aria-invalid (D108). An unchecked box marked aria-invalid outlines in the error colour (D108)." `Switch`: the same, with `useFieldWiring("Switch", rest, { choice: true })`, and the docblock says it reads a Field as Checkbox does.

- [ ] **Step 4: Stories.** Add `InAField` to `Checkbox.stories.tsx`:

```tsx
export const InAField: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24 }}>
      <Field label="Notifications" error="Choose how we reach you." required>
        <Checkbox>Email me weekly</Checkbox>
      </Field>
      <Field error="You must accept the terms.">
        <Checkbox>I accept the terms</Checkbox>
      </Field>
    </div>
  ),
};
```

Add the same to `Switch.stories.tsx` (import `Field`), with `<Switch>Email me weekly</Switch>` under a "Notifications" Field in error.

- [ ] **Step 5: axe.** Add to the `a11y.axe.test.tsx` cases:

```tsx
  ["Checkbox in an invalid, labelled Field (D135)", <Field label="Notifications" error="Choose one." required><Checkbox>Email me weekly</Checkbox></Field>],
  ["Switch in an invalid, labelled Field (D135)", <Field label="Notifications" error="Choose one."><Switch>Email me weekly</Switch></Field>],
```

- [ ] **Step 6: Interaction spec.** Read Chromium's own accessibility tree over CDP:

```ts
import { test, expect } from "@playwright/test";

/** D135 — a Checkbox or Switch in a Field that is not a group: Chromium names it by the Field's label and its own,
 * describes it by the Field's message, and exposes it invalid. Read from the browser's accessibility tree. */
const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

for (const [id, role] of [["components-checkbox--in-a-field", "checkbox"], ["components-switch--in-a-field", "switch"]] as const) {
  test(`${id} is named, described and invalid in Chromium's tree @interaction`, async ({ page }) => {
    await page.goto(story(id), { waitUntil: "networkidle" });
    const cdp = await page.context().newCDPSession(page);
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    const controls = nodes.filter((n) => n.role?.value === role);
    const first = controls[0]!;
    const invalid = first.properties?.find((p) => p.name === "invalid")?.value.value;
    expect(first.name?.value).toBe("Notifications Email me weekly");
    expect(first.description?.value).toMatch(/^Choose/);
    expect(invalid).toBe("true");
  });
}
```

- [ ] **Step 7: Run** the unit tests, `pnpm build`, then `CI=1 npx playwright test -c apps/storybook/vr field-wiring`. Expect PASS.

- [ ] **Step 8: Commit** — `feat(react): Checkbox and Switch take a Field's wiring outside group mode (D135)`.

### Task 3: The toolbar's control width reaches a top-labelled Field's control (P123)

**Files:**
- Modify: `packages/react/src/Field/Field.tsx` (`data-psi-field` in `layout`), `packages/react/src/Toolbar/toolbar.module.css`, `Toolbar.tsx` (doc)
- Test: `Field.test.tsx`, `Toolbar.test.tsx`, `apps/storybook/vr/toolbar-control-width.interaction.spec.ts` (already drafted)

- [ ] **Step 1: Failing tests.**

`Field.test.tsx`:
```tsx
  it("marks its root with data-psi-field in every mode (D135)", () => {
    const { container, rerender } = render(<Field label="A"><Input /></Field>);
    expect(container.firstElementChild).toHaveAttribute("data-psi-field");
    rerender(<Field group label="A"><Checkbox>x</Checkbox></Field>);
    expect(container.firstElementChild).toHaveAttribute("data-psi-field");
    rerender(<Field group labelPosition="start" label="A"><Checkbox>x</Checkbox></Field>);
    expect(container.firstElementChild).toHaveAttribute("data-psi-field");
  });
```

`Toolbar.test.tsx`, beside the D92 rule tests:
```tsx
  it("gives the toolbar width to a top-labelled Field's control without controlWidth (D135)", () => {
    expect(
      rule(".toolbar > [data-psi-field]:not([data-control-width]):not([data-label-position]) > :is(input, select, [data-psi-combobox])"),
    ).toMatch(/width:\s*var\(--psi-toolbar-control-width\);/);
  });
  it("keeps the bare-control rule, a bare Combobox included (D130)", () => {
    expect(rule(".toolbar > input,\n.toolbar > select,\n.toolbar > [data-psi-combobox]")).toMatch(
      /width:\s*var\(--psi-toolbar-control-width\);/,
    );
  });
```

Interaction spec: add a pager case. `patterns-presets--table-pagination` and `--cursor-pagination`: `#storybook-root [data-psi-field] > select` measures under 100.

- [ ] **Step 2: Run, expect FAIL** (unit), then build and run the interaction spec: the filter-form controls measure 172 and 79.6.

- [ ] **Step 3: Implement.** In `Field.tsx`, `layout` gains `"data-psi-field": ""`. In `toolbar.module.css`, after the bare rule:

```css
/* D135: the control of a top-labelled Field takes the same width, so a row of
   labelled filters is as even as an unlabelled one. A Field's controlWidth
   (D125) replaces it; a side-labelled Field (a "Rows per page" pair, D115)
   keeps its content width. The same three controls as the bare rule. */
.toolbar > [data-psi-field]:not([data-control-width]):not([data-label-position]) > :is(input, select, [data-psi-combobox]) {
  width: var(--psi-toolbar-control-width);
}
```

Update the token comment in `packages/tokens/src/components/toolbar.ts` ("Field-wrapped controls are unaffected …") to say that a top-labelled Field's control takes it too (D135).

- [ ] **Step 4: Run, expect PASS** — unit tests; `pnpm build`; `CI=1 npx playwright test -c apps/storybook/vr toolbar-control-width field-control-width filter-form field-label-position`.

- [ ] **Step 5: Commit** — `feat(react): the toolbar's control width reaches a top-labelled Field's control (D135)`.

### Task 4: Docs, changeset, decision range, gates

- [ ] `a11y-meta.ts` (the Field entry): wiring reaches Input, Select, Textarea, Checkbox and Switch, and the Field's win (D135).
- [ ] `packages/react/llms.txt`:
  - line 157: list the controls, state the precedence and `htmlFor`, and drop "Input/Select";
  - line 159: replace "`filter-form` keeps its controls at their natural width" with the D135 rule.
- [ ] `packages/tokens/src/guidance.ts` line 23: replace "filter-form controls keep their natural width unless a Field sets controlWidth (D125)" with the same rule.
- [ ] `Toolbar.tsx` docblock: one sentence on the control width.
- [ ] `.changeset/field-wiring.md`: minor for `@handamade/psi-react` and `@handamade/psi-tokens` (the token comment ships in tokens docs). It says plainly that a caller's `id` inside a Field is no longer used and that `htmlFor` sets it.
- [ ] `CLAUDE.md`: decision range `D1–D132` → the highest merged number at PR time.
- [ ] The five gates. Then commit, push and open the PR with auto-merge armed and read back.
