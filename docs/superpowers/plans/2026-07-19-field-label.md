# Field (D49) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `Field` labeled form-row wrapper (spec: `docs/superpowers/specs/2026-07-19-field-label-design.md`, D49) — label above, one message line below (error replaces description), with a context bridge that auto-wires `id`/`aria-describedby`/`aria-invalid`/error styling into Input and Select.

**Architecture:** New `Field` component + `FieldContext` in `packages/react/src/Field/`; new `--psi-field-*` component tokens in `packages/tokens/src/components/field.ts`; small additive changes to Input and Select to consume the context. Everything else (manifest, docs, MCP brief) regenerates from source.

**Tech Stack:** React 19 function components (no forwardRef — `ref` is a normal prop), CSS Modules bound to `var(--psi-*)`, vitest + @testing-library/react + axe-core, react-docgen-typescript manifest.

## Global Constraints

- Sizes are px numbers (`24 | 32 | 40 | 48`), never S/M/L. Field itself has NO size and NO variant prop.
- Component CSS may only reference `--psi-field-*` tokens and the global scales (`--psi-space/size/radius/text/font/duration/ease/z-*`) — the stylelint plugin `psi/component-tokens-only` enforces this (`tools/stylelint-plugin-psi-tokens.mjs` derives the component name from the CSS-module filename: `field.module.css` → `--psi-field-*`).
- Never hardcode colors; token values live in `packages/tokens/src`, never in dist.
- Error replaces description — never render both.
- Checkbox/Switch do NOT consume FieldContext (group mode's fieldset covers them).
- Verify with `pnpm build` (WCAG contrast gate), `pnpm test`, `pnpm lint` — all three must pass before each commit.
- Work on branch `feat/field-0-5` off `origin/main` (after spec PR #25 is merged).

---

### Task 1: Field component tokens

**Files:**
- Create: `packages/tokens/src/components/field.ts`
- Modify: `packages/tokens/scripts/build.ts` (import at ~line 31, registry entry at ~line 151)
- Test: `packages/tokens/__tests__/field-tokens.test.ts`

**Interfaces:**
- Produces: `fieldVars: Record<string, string>` with keys `label-fg`, `message-fg`, `error-fg`, `marker-fg`, `gap` → emitted as `--psi-field-label-fg` etc. in `dist/components.css` (consumed by Task 2's CSS).

- [ ] **Step 1: Write the failing test**

```ts
// packages/tokens/__tests__/field-tokens.test.ts
import { describe, it, expect } from "vitest";
import { fieldVars } from "../src/components/field.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";

describe("field tokens", () => {
  it("declares the five D49 tokens bound to gated semantics", () => {
    expect(fieldVars).toEqual({
      "label-fg": "var(--psi-fg-secondary)",
      "message-fg": "var(--psi-fg-tertiary)",
      "error-fg": "var(--psi-fg-danger)",
      "marker-fg": "var(--psi-fg-danger)",
      gap: "var(--psi-space-6)",
    });
  });

  it("emits --psi-field-* custom properties", () => {
    const css = emitComponentVarsCSS({ field: fieldVars });
    expect(css).toContain("--psi-field-label-fg: var(--psi-fg-secondary)");
    expect(css).toContain("--psi-field-gap: var(--psi-space-6)");
  });
});
```

Note: check `emitComponentVarsCSS`'s exact signature in `packages/tokens/scripts/emit-components.ts` before running — if it takes `(name, vars)` pairs instead of a record, mirror how `packages/tokens/__tests__/emit-components.test.ts` calls it and adjust the second test accordingly (assertions stay the same).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/tokens/__tests__/field-tokens.test.ts`
Expected: FAIL — `Cannot find module '../src/components/field.js'`

- [ ] **Step 3: Write the token source**

```ts
// packages/tokens/src/components/field.ts
/** Field component tokens (--psi-field-*). Label/message/error colors alias
 * gated semantic fg tokens; gap is the label→control→message grid gap (D49). */
export const fieldVars: Record<string, string> = {
  "label-fg": "var(--psi-fg-secondary)",
  "message-fg": "var(--psi-fg-tertiary)",
  "error-fg": "var(--psi-fg-danger)",
  "marker-fg": "var(--psi-fg-danger)",
  gap: "var(--psi-space-6)",
};
```

- [ ] **Step 4: Register in the build**

In `packages/tokens/scripts/build.ts`: add `import { fieldVars } from "../src/components/field.js";` next to the other component imports (~line 31), and add `field: fieldVars,` to the `componentVars` record (~line 151, alphabetical placement with the others).

- [ ] **Step 5: Run tests + build to verify**

Run: `pnpm vitest run packages/tokens/__tests__/field-tokens.test.ts` → PASS
Run: `pnpm build` → contrast gate passes; `grep -- "--psi-field-label-fg" packages/tokens/dist/components.css` prints the declaration.

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/src/components/field.ts packages/tokens/scripts/build.ts packages/tokens/__tests__/field-tokens.test.ts
git commit -m "feat(tokens): Field component tokens (--psi-field-*, D49)"
```

---

### Task 2: Field component + FieldContext + CSS

**Files:**
- Create: `packages/react/src/Field/Field.tsx`
- Create: `packages/react/src/Field/field.module.css`
- Test: `packages/react/src/Field/Field.test.tsx`

**Interfaces:**
- Consumes: `--psi-field-*` custom properties from Task 1.
- Produces: `Field` component, `FieldProps`, and `FieldContext` with value type `FieldContextValue { id: string; describedBy?: string; invalid: boolean; required: boolean }` — Task 3's Input/Select `useContext(FieldContext)` this exact shape. `FieldContext` is exported from `Field.tsx` but NOT re-exported from the package index.

- [ ] **Step 1: Write the failing tests**

```tsx
// packages/react/src/Field/Field.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field } from "./Field.js";
import { Input } from "../Input/Input.js";
import { Checkbox } from "../Checkbox/Checkbox.js";

describe("Field", () => {
  it("associates the label with the wrapped control", () => {
    render(
      <Field label="Email">
        <Input size={40} />
      </Field>,
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders the description on the message line", () => {
    render(
      <Field label="Email" description="Used for sign-in.">
        <Input />
      </Field>,
    );
    expect(screen.getByText("Used for sign-in.")).toBeInTheDocument();
  });

  it("error replaces the description", () => {
    render(
      <Field label="Email" description="Used for sign-in." error="Invalid email.">
        <Input />
      </Field>,
    );
    expect(screen.getByText("Invalid email.")).toBeInTheDocument();
    expect(screen.queryByText("Used for sign-in.")).not.toBeInTheDocument();
  });

  it("message line is polite live region", () => {
    render(
      <Field label="Email" error="Invalid email.">
        <Input />
      </Field>,
    );
    expect(screen.getByText("Invalid email.")).toHaveAttribute("aria-live", "polite");
  });

  it("renders required marker on the label", () => {
    const { container } = render(
      <Field label="Name" required>
        <Input />
      </Field>,
    );
    expect(container.querySelector("label span[aria-hidden]")).toHaveTextContent("*");
  });

  it("group mode renders fieldset/legend with describedby on the fieldset", () => {
    render(
      <Field group label="Notifications" description="Choose your channels." data-testid="grp">
        <Checkbox>Email</Checkbox>
        <Checkbox>Push</Checkbox>
      </Field>,
    );
    const fieldset = screen.getByRole("group", { name: "Notifications" });
    const message = screen.getByText("Choose your channels.");
    expect(fieldset.tagName).toBe("FIELDSET");
    expect(fieldset).toHaveAttribute("aria-describedby", message.id);
  });

  it("explicit htmlFor override wins over the generated id", () => {
    render(
      <Field label="Custom" htmlFor="my-input">
        <Input id="my-input" />
      </Field>,
    );
    expect(screen.getByLabelText("Custom")).toHaveAttribute("id", "my-input");
  });

  it("no message line renders when neither description nor error is given", () => {
    const { container } = render(
      <Field label="Bare">
        <Input />
      </Field>,
    );
    expect(container.querySelector("p")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run packages/react/src/Field/Field.test.tsx`
Expected: FAIL — `Cannot find module './Field.js'`

- [ ] **Step 3: Write the CSS module**

```css
/* packages/react/src/Field/field.module.css */
.field {
  display: grid;
  gap: var(--psi-field-gap);
  border: 0; /* fieldset reset (group mode) */
  margin: 0;
  padding: 0;
  min-width: 0;
}

.label {
  font: var(--psi-text-14-20-medium);
  color: var(--psi-field-label-fg);
  padding: 0; /* legend reset (group mode) */
}

.marker {
  color: var(--psi-field-marker-fg);
}

.message {
  margin: 0;
  font: var(--psi-text-12-16-regular);
  color: var(--psi-field-message-fg);
}

.invalid .message {
  color: var(--psi-field-error-fg);
}
```

- [ ] **Step 4: Write the component**

```tsx
// packages/react/src/Field/Field.tsx
import { createContext, useId } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./field.module.css";

/** Wiring a Field provides to its control (Input/Select consume it; D49). */
export interface FieldContextValue {
  /** Generated (or htmlFor-overridden) id the label points at. */
  id: string;
  /** id of the rendered message line, if any — joins aria-describedby. */
  describedBy?: string;
  /** True when the Field carries an error. */
  invalid: boolean;
  /** Mirrors Field's required prop into the control. */
  required: boolean;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

export interface FieldProps extends HTMLAttributes<HTMLElement> {
  /** Label content; renders a <label> (or <legend> in group mode). */
  label?: ReactNode;
  /** Helper line under the control; replaced by error when error is set. */
  description?: ReactNode;
  /** Error content; when truthy it replaces the description and switches the
   * field (and a wrapped Input/Select) into error state. */
  error?: ReactNode;
  /** Renders the required marker and flows `required` to the control. @default false */
  required?: boolean;
  /** Group mode: fieldset/legend wrapping several self-labeled controls
   * (Checkbox/Switch); the message describes the whole group. @default false */
  group?: boolean;
  /** Override the generated control id (pair it with the same id on the control). */
  htmlFor?: string;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement | HTMLFieldSetElement>;
}

/** Labeled form-row wrapper: label above, control, one message line below —
 * description normally, error when set (aria-live). Auto-wires
 * id/aria-describedby/aria-invalid into Input and Select (D49). */
export function Field({
  label,
  description,
  error,
  required = false,
  group = false,
  htmlFor,
  className,
  children,
  ref,
  ...rest
}: FieldProps) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  const invalid = Boolean(error);
  const message = invalid ? error : description;
  const messageId = message != null && message !== false ? `${id}-message` : undefined;

  const cls = [styles.field, invalid && styles.invalid, className].filter(Boolean).join(" ");

  const labelContent =
    label != null ? (
      <>
        {label}
        {required && (
          <span aria-hidden="true" className={styles.marker}>
            {" *"}
          </span>
        )}
      </>
    ) : null;

  const body = (
    <>
      {labelContent != null &&
        (group ? (
          <legend className={styles.label}>{labelContent}</legend>
        ) : (
          <label className={styles.label} htmlFor={id}>
            {labelContent}
          </label>
        ))}
      <FieldContext.Provider value={{ id, describedBy: messageId, invalid, required }}>
        {children}
      </FieldContext.Provider>
      {messageId && (
        <p id={messageId} className={styles.message} aria-live="polite">
          {message}
        </p>
      )}
    </>
  );

  return group ? (
    <fieldset
      ref={ref as Ref<HTMLFieldSetElement>}
      className={cls}
      aria-describedby={messageId}
      {...rest}
    >
      {body}
    </fieldset>
  ) : (
    <div ref={ref as Ref<HTMLDivElement>} className={cls} {...rest}>
      {body}
    </div>
  );
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run packages/react/src/Field/Field.test.tsx`
Expected: 7 of 8 PASS; "associates the label with the wrapped control" and the htmlFor test FAIL — Input doesn't consume the context yet (label points at the generated id, but the input has no id). That's Task 3's job. If MORE than those two fail, fix Field before proceeding.

- [ ] **Step 6: Commit (tests red for the two context cases is expected — note it)**

```bash
git add packages/react/src/Field/
git commit -m "feat(react): Field component + FieldContext (D49) — label association pending Input wiring"
```

---

### Task 3: Input and Select consume FieldContext

**Files:**
- Modify: `packages/react/src/Input/Input.tsx`
- Modify: `packages/react/src/Select/Select.tsx`
- Test: append to `packages/react/src/Field/Field.test.tsx`

**Interfaces:**
- Consumes: `FieldContext`, `FieldContextValue` from `../Field/Field.js` (Task 2).
- Produces: Input/Select that, inside a Field, take the context id (own `id` wins), merge `describedBy` into `aria-describedby`, set `aria-invalid`, apply error styling on context `invalid`, and set `required`. Standalone behavior unchanged.

- [ ] **Step 1: Append the failing tests**

```tsx
// append to packages/react/src/Field/Field.test.tsx
import { Select } from "../Select/Select.js";

describe("FieldContext wiring", () => {
  it("wires describedby, invalid and required into a wrapped Input", () => {
    render(
      <Field label="Email" error="Invalid email." required>
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByLabelText(/Email/);
    const message = screen.getByText("Invalid email.");
    expect(input).toHaveAttribute("aria-describedby", message.id);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toBeRequired();
  });

  it("wires a wrapped Select the same way", () => {
    render(
      <Field label="Plan" description="Billed monthly.">
        <Select>
          <option>Free</option>
        </Select>
      </Field>,
    );
    const select = screen.getByLabelText("Plan");
    const message = screen.getByText("Billed monthly.");
    expect(select).toHaveAttribute("aria-describedby", message.id);
    expect(select).not.toHaveAttribute("aria-invalid");
  });

  it("merges an own aria-describedby with the Field one", () => {
    render(
      <Field label="Email" description="Hint.">
        <Input aria-describedby="external-hint" />
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    const message = screen.getByText("Hint.");
    expect(input.getAttribute("aria-describedby")).toBe(`${message.id} external-hint`);
  });

  it("standalone Input keeps its own error prop and gains nothing", () => {
    render(<Input error aria-label="Solo" />);
    const input = screen.getByLabelText("Solo");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("id");
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `pnpm vitest run packages/react/src/Field/Field.test.tsx`
Expected: the three wiring tests FAIL (no describedby/invalid on the control); the standalone test PASSES; the two red tests from Task 2 stay red.

- [ ] **Step 3: Wire Input**

Replace `packages/react/src/Input/Input.tsx` body with:

```tsx
import { useContext } from "react";
import type { InputHTMLAttributes, Ref } from "react";
import { FieldContext } from "../Field/Field.js";
import styles from "./input.module.css";

type Size = 24 | 32 | 40 | 48;

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Height in px (24 | 32 | 40 | 48). @default 32 */
  size?: Size;
  /** Show error styling. Inside a Field, the Field's error also lights this. @default false */
  error?: boolean;
  /** Forwarded ref to the underlying `<input>` element. */
  ref?: Ref<HTMLInputElement>;
}

const sizeClass: Record<Size, string> = {
  24: styles.size24,
  32: styles.size32,
  40: styles.size40,
  48: styles.size48,
};

/** Single-line text input with pixel-true heights (24–48) and an error state.
 * Inside a Field, id/aria-describedby/aria-invalid/required are wired
 * automatically (D49). */
export function Input({ size = 32, error = false, className, ref, ...rest }: InputProps) {
  const field = useContext(FieldContext);
  const invalid = error || (field?.invalid ?? false);
  const describedBy =
    [field?.describedBy, rest["aria-describedby"]].filter(Boolean).join(" ") || undefined;

  const cls = [styles.input, sizeClass[size], invalid && styles.error, className]
    .filter(Boolean)
    .join(" ");

  return (
    <input
      ref={ref}
      className={cls}
      id={rest.id ?? field?.id}
      required={rest.required ?? (field?.required || undefined)}
      aria-invalid={invalid || undefined}
      {...rest}
      aria-describedby={describedBy}
    />
  );
}
```

Note the ordering: `id`/`required`/`aria-invalid` sit BEFORE `{...rest}` so an explicit consumer prop wins; `aria-describedby` sits AFTER because the merged value already incorporates `rest["aria-describedby"]`.

- [ ] **Step 4: Wire Select identically**

Apply the same transformation to `packages/react/src/Select/Select.tsx`: add the `useContext(FieldContext)` import and the `invalid`/`describedBy` derivation, render `<select ... id={rest.id ?? field?.id} required={rest.required ?? (field?.required || undefined)} aria-invalid={invalid || undefined} {...rest} aria-describedby={describedBy}>` keeping its existing wrapper/chevron markup and `sizeClass` logic exactly as-is, and extend its `error` prop TSDoc with the same "Inside a Field..." sentence.

- [ ] **Step 5: Run the full Field suite**

Run: `pnpm vitest run packages/react/src/Field/Field.test.tsx`
Expected: ALL tests pass, including the two left red in Task 2.

- [ ] **Step 6: Run everything**

Run: `pnpm test` → all green (Input/Select regression suites included). `pnpm lint` → clean.

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/Input/Input.tsx packages/react/src/Select/Select.tsx packages/react/src/Field/Field.test.tsx
git commit -m "feat(react): Input/Select consume FieldContext — auto id/describedby/invalid/required (D49)"
```

---

### Task 4: Exports, manifest, axe, a11y-meta, story

**Files:**
- Modify: `packages/react/src/index.ts`
- Modify: `packages/react/scripts/emit-manifest.ts` (COMPONENTS array)
- Modify: `packages/react/src/a11y.axe.test.tsx`
- Modify: `packages/react/src/a11y-meta.ts`
- Create: `packages/react/src/Field/Field.stories.tsx`

**Interfaces:**
- Consumes: `Field`, `FieldProps` from Task 2 (context wiring from Task 3).
- Produces: `Field` in the public API, manifest entry (docgen), axe coverage, docs a11y section, Storybook story (auto-enrolls in the VR suite).

- [ ] **Step 1: Export from the index**

Add to `packages/react/src/index.ts` after the AspectRatio pair:

```ts
export { Field } from "./Field/Field.js";
export type { FieldProps } from "./Field/Field.js";
```

(`FieldContext` deliberately NOT exported — internal contract.)

- [ ] **Step 2: Add to the manifest inventory**

In `packages/react/scripts/emit-manifest.ts` add `"Field",` to the `COMPONENTS` array (after `"Select",`).

- [ ] **Step 3: Extend the axe suite**

In `packages/react/src/a11y.axe.test.tsx`, import `Field` in the existing index import and add to `cases`:

```tsx
["Field with Input", <Field label="Email" description="We never share it."><Input size={40} /></Field>],
["Field error", <Field label="Email" error="Invalid email." required><Input size={40} /></Field>],
["Field group", <Field group label="Notifications" description="Pick channels."><Checkbox>Email</Checkbox><Switch>Push</Switch></Field>],
```

Run: `pnpm vitest run packages/react/src/a11y.axe.test.tsx` → PASS (3 new cases, zero violations).

- [ ] **Step 4: a11y-meta entry + Input/Select note update**

In `packages/react/src/a11y-meta.ts` add:

```ts
Field: {
  keyboard: [
    { keys: "Tab", behavior: "Focus moves to the wrapped control; the label is announced with it." },
  ],
  notes:
    "Wires label association, aria-describedby and aria-invalid into a wrapped Input/Select automatically; the message line is aria-live=polite. Group mode renders fieldset/legend.",
},
```

And update the existing `Input` entry's note (it currently says "error sets a red border only — pair with aria-invalid and aria-describedby pointing at your error text.") to:

```ts
notes: "error sets a red border only. Inside a Field, aria-invalid and aria-describedby are wired automatically (D49); standalone, pair them yourself.",
```

Make the equivalent adjustment to the `Select` entry if it carries the same standalone-pairing advice.

- [ ] **Step 5: Story**

```tsx
// packages/react/src/Field/Field.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Field } from "./Field.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { Switch } from "../Switch/Switch.js";

const meta: Meta<typeof Field> = {
  title: "Components/Field",
  component: Field,
};
export default meta;
type Story = StoryObj<typeof Field>;

export const Default: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24, maxWidth: 420 }}>
      <Field label="Email" description="Used for sign-in.">
        <Input size={40} type="email" defaultValue="ada@example.com" />
      </Field>
      <Field label="Email" error="That doesn't look like an email." required>
        <Input size={40} type="email" defaultValue="ada@" />
      </Field>
      <Field label="Plan" description="Billed monthly.">
        <Select size={40} defaultValue="pro">
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </Select>
      </Field>
      <Field group label="Notifications" description="Choose your channels.">
        <Checkbox defaultChecked>Email</Checkbox>
        <Switch>Push</Switch>
      </Field>
    </div>
  ),
};
```

Check the exact `Meta` import path against `packages/react/src/NavBar/NavBar.stories.tsx` and mirror it (the Storybook version may use `@storybook/react-vite`).

- [ ] **Step 6: Full gauntlet + manifest check**

Run: `pnpm build && pnpm test && pnpm lint` → all green.
Run: `node -e "const m=require('./packages/react/dist/manifest.json');const f=m.components.find(c=>c.name==='Field');console.log(f.description, f.props.map(p=>p.name).join(','))"`
Expected: the D49 one-liner + props `label,description,error,required,group,htmlFor,ref,className`.

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/index.ts packages/react/scripts/emit-manifest.ts packages/react/src/a11y.axe.test.tsx packages/react/src/a11y-meta.ts packages/react/src/Field/Field.stories.tsx packages/react/docs/
git commit -m "feat(react): Field in public API — manifest, axe, a11y-meta, story (D49)"
```

---

### Task 5: Guidance steering line + changeset

**Files:**
- Modify: `packages/tokens/src/guidance.ts` (the `rules` array, ~line 13)
- Create: `.changeset/field-component.md`
- Test: existing suites only (guidance shape is covered by index-builder tests reading real dist)

**Interfaces:**
- Consumes: nothing new.
- Produces: agent steering in `guidance.json` → `topic:rules`; release bookkeeping.

- [ ] **Step 1: Add the steering rule**

In `packages/tokens/src/guidance.ts`, append to the `rules` array (match the existing string style exactly — read 2-3 neighboring entries first):

```ts
"Wrap labeled form controls in Field — label association, description/error line, aria-describedby and aria-invalid come wired; don't hand-roll label+message rows.",
```

- [ ] **Step 2: Changeset**

```md
<!-- .changeset/field-component.md -->
---
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
---

New `Field` component (D49): labeled form-row wrapper — label above, one
message line below (error replaces description, aria-live), fieldset/legend
group mode. Input and Select now consume FieldContext when wrapped:
id/aria-describedby/aria-invalid/required are wired automatically (additive —
standalone behavior unchanged). New `--psi-field-*` component tokens.
```

- [ ] **Step 3: Full gauntlet**

Run: `pnpm build && pnpm test && pnpm lint` → all green. The rebuilt `guidance.json` carries the new rule: `grep -c "Wrap labeled form controls in Field" packages/tokens/dist/guidance.json` → 1.

- [ ] **Step 4: Commit and open the PR**

```bash
git add packages/tokens/src/guidance.ts .changeset/field-component.md
git commit -m "feat(tokens): Field steering rule in guidance + 0.5 changeset (D49)"
git push -u origin feat/field-0-5
gh pr create --base main --head feat/field-0-5 --title "feat: Field component (D49, HAN-11)" --body "Implements docs/superpowers/specs/2026-07-19-field-label-design.md"
```

---

## Self-Review Notes

- Spec coverage: anatomy/props/context (Task 2), Input/Select wiring incl. own-prop-wins and merge (Task 3), group mode + describedby-on-fieldset (Task 2), tokens (Task 1), manifest/docs/axe/story/a11y-meta (Task 4), guidance + release (Task 5). Layout label-above only — no orientation code anywhere. Out-of-scope items have no tasks, correctly.
- Deliberate deviation from strict TDD in Task 2: two label-association tests stay red until Task 3 lands (the context consumer is a separate reviewable unit). Noted in both tasks' expected-output lines.
- Type consistency: `FieldContextValue` field names (`id`, `describedBy`, `invalid`, `required`) match between Task 2's definition and Task 3's consumption; `fieldVars` keys match the CSS custom-property names Task 2's CSS consumes.
