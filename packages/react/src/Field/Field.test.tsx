import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { Field } from "./Field.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { Textarea } from "../Textarea/Textarea.js";

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

  it("announce={false} renders the message line without a live region (D81)", () => {
    render(
      <Field label="Email" error="Invalid email." announce={false}>
        <Input />
      </Field>,
    );
    const message = screen.getByText("Invalid email.");
    expect(message).not.toHaveAttribute("aria-live");
    // Announcing moves out; the description association stays.
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-describedby", message.id);
  });

  it("announce={false} leaves no live region anywhere in the field (D81)", () => {
    const { container } = render(
      <Field label="Email" description="Used for sign-in." announce={false}>
        <Input />
      </Field>,
    );
    expect(container.querySelector("[aria-live]")).toBeNull();
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

  it("standalone error prop does not set aria-invalid (styling only)", () => {
    render(<Input error aria-label="SoloInvalid" />);
    expect(screen.getByLabelText("SoloInvalid")).not.toHaveAttribute("aria-invalid");
  });

  it("standalone Select error prop does not set aria-invalid (styling only)", () => {
    render(
      <Select error aria-label="SoloInvalidSelect">
        <option>Free</option>
      </Select>,
    );
    expect(screen.getByLabelText("SoloInvalidSelect")).not.toHaveAttribute("aria-invalid");
  });

  it("own error inside an error-free Field does not set aria-invalid", () => {
    render(
      <Field label="Nick" description="Optional.">
        <Input error />
      </Field>,
    );
    expect(screen.getByLabelText("Nick")).not.toHaveAttribute("aria-invalid");
  });

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
});

describe("label line box (D92)", () => {
  // A Toolbar align="start" row offsets an unlabelled button by
  // --psi-toolbar-action-offset, derived from --psi-field-label-height. The
  // label must hold that height, so the token and the rendered line agree.
  it("the label holds at least --psi-field-label-height", () => {
    const css = readFileSync(join(import.meta.dirname, "field.module.css"), "utf8");
    const label = /\.label\s*\{([^}]*)\}/.exec(css)![1];
    expect(label).toMatch(/min-block-size:\s*var\(--psi-field-label-height\);/);
  });
});

describe("labelPosition (D115)", () => {
  const css = () => readFileSync(join(import.meta.dirname, "field.module.css"), "utf8");

  it("defaults to top: no position attribute, today's markup", () => {
    const { container } = render(<Field label="Email"><Input /></Field>);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toHaveAttribute("data-label-position");
    expect(root).not.toHaveAttribute("data-in-stack");
    expect(root.firstElementChild?.tagName).toBe("LABEL");
  });

  it("start keeps the label naming the control, and the order label, control, message", () => {
    const { container } = render(
      <Field label="Rows per page" labelPosition="start" description="Applies to every list.">
        <Select size={32}><option>50</option></Select>
      </Field>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-label-position", "start");
    expect(screen.getByLabelText("Rows per page").tagName).toBe("SELECT");
    expect([...root.children].map((el) => el.tagName)).toEqual(["LABEL", "SELECT", "P"]);
    expect(screen.getByLabelText("Rows per page")).toHaveAttribute(
      "aria-describedby",
      screen.getByText("Applies to every list.").id,
    );
  });

  it("start in group mode keeps the group named and described", () => {
    render(
      <Field group label="Notify me" labelPosition="start" error="Pick one.">
        <Checkbox>Email</Checkbox>
      </Field>,
    );
    const group = screen.getByRole("group", { name: "Notify me" });
    expect(group.tagName).toBe("DIV");
    expect(group).toHaveAttribute("aria-describedby", screen.getByText("Pick one.").id);
    expect(group).toHaveAttribute("aria-labelledby", screen.getByText("Notify me").id);
    expect(group).toHaveAttribute("data-label-position", "start");
  });

  it("the start layout puts the label in column 1 and everything else in column 2", () => {
    const start = /\.field\[data-label-position="start"\]\s*\{([^}]*)\}/.exec(css())![1];
    expect(start).toMatch(/grid-template-columns:\s*auto auto;/);
    expect(start).toMatch(/column-gap:\s*var\(--psi-field-column-gap\);/);
    expect(css()).toMatch(/\.field\[data-label-position="start"\]\s*>\s*\*\s*\{\s*grid-column:\s*2;/);
    const label = /\.field\[data-label-position="start"\]\s*>\s*\.label\s*\{([^}]*)\}/.exec(css())![1];
    expect(label).toMatch(/grid-column:\s*1;/);
    expect(label).toMatch(/text-align:\s*var\(--psi-field-label-align\);/);
  });

  it("a start label spans the message row, and the narrow layout releases it", () => {
    expect(css()).toMatch(
      /\.field\[data-label-position="start"\]:has\(>\s*\.message\)\s*>\s*\.label\s*\{[^}]*grid-row:\s*span 2;/,
    );
    // The message row is flexible, so a tall label's extra height goes to it
    // and not to the control's row (measured 12px instead of 6px on Linux).
    expect(css()).toMatch(
      /\.field\[data-label-position="start"\]:has\(>\s*\.message\)\s*\{[^}]*grid-template-rows:\s*auto 1fr;/,
    );
    const narrow = /@container psi-field-stack[^{]*\{([\s\S]*)\}\s*$/.exec(css())![1];
    expect(narrow).toMatch(
      /\.field\[data-in-stack="start"\]\[data-label-position="start"\]\s*\{[^}]*grid-template-rows:\s*none;/,
    );
    expect(narrow).toMatch(
      /\.field\[data-in-stack="start"\]\[data-label-position="start"\]\s*>\s*\.label\s*\{[^}]*grid-row:\s*auto;/,
    );
  });

  it("the top layout's rules are unchanged", () => {
    expect(/\.field\s*\{([^}]*)\}/.exec(css())![1]).not.toMatch(/grid-template-columns/);
  });
});

describe("controlWidth (D125)", () => {
  const css = () => readFileSync(join(import.meta.dirname, "field.module.css"), "utf8");
  const steps = [80, 120, 160, 240, 320, 480] as const;

  it("writes data-control-width on the root for each step, and nothing without the prop", () => {
    const { container, rerender } = render(<Field label="Name"><Input /></Field>);
    const root = () => container.firstElementChild as HTMLElement;
    expect(root()).not.toHaveAttribute("data-control-width");
    for (const step of steps) {
      rerender(<Field label="Name" controlWidth={step}><Input /></Field>);
      expect(root()).toHaveAttribute("data-control-width", String(step));
    }
  });

  it("a caller's own data-control-width does not override the prop", () => {
    const { container } = render(
      <Field label="Name" controlWidth={240} {...{ "data-control-width": "999" }}><Input /></Field>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-control-width", "240");
  });

  it("a start Field and a group Field carry it too", () => {
    const { container } = render(
      <>
        <Field label="ICCID" labelPosition="start" controlWidth={240}><Input /></Field>
        <Field group label="Notify me" controlWidth={160}><Checkbox>Email</Checkbox></Field>
      </>,
    );
    const [start, group] = [...container.children] as HTMLElement[];
    expect(start).toHaveAttribute("data-control-width", "240");
    expect(start).toHaveAttribute("data-label-position", "start");
    expect(group.tagName).toBe("FIELDSET");
    expect(group).toHaveAttribute("data-control-width", "160");
  });

  it("each step sizes every child but the label and the message, and lets it shrink", () => {
    for (const step of steps) {
      const re = new RegExp(
        String.raw`\.field\[data-control-width="${step}"\]\s*>\s*:not\(\.label\):not\(\.message\)\s*\{([^}]*)\}`,
      );
      const rule = re.exec(css())?.[1];
      expect(rule, `step ${step}`).toBeDefined();
      expect(rule).toMatch(new RegExp(String.raw`inline-size:\s*${step}px;`));
      expect(rule).toMatch(/max-inline-size:\s*100%;/);
    }
  });

  it("a sized Field's track shrinks with the field, in the right source order", () => {
    const text = css();
    expect(text).toContain(".field[data-control-width] {\n  grid-template-columns: minmax(0, 1fr);\n}");
    const start = text.indexOf(
      '.field[data-control-width][data-label-position="start"] {\n  grid-template-columns: auto minmax(0, 1fr);',
    );
    expect(start).toBeGreaterThan(-1);
    expect(start).toBeGreaterThan(text.indexOf('.field[data-label-position="start"] {'));
    expect(start).toBeLessThan(text.indexOf("grid-template-columns: subgrid"));
    expect(start).toBeLessThan(text.indexOf("@container psi-field-stack"));
  });
});

describe("the Field's wiring wins (D135)", () => {
  const controls = {
    Input: () => <Input id="own" aria-invalid={false} required={false} />,
    Select: () => (
      <Select id="own" aria-invalid={false} required={false}>
        <option>a</option>
      </Select>
    ),
    Textarea: () => <Textarea id="own" aria-invalid={false} required={false} />,
  };
  for (const [name, Control] of Object.entries(controls)) {
    it(`${name} takes the Field's id, aria-invalid and required over the caller's`, () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <Field label="Email" error="Not an address." required>
          <Control />
        </Field>,
      );
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
    render(
      <Field label="Nick">
        <Input aria-invalid required />
      </Field>,
    );
    const input = screen.getByLabelText("Nick");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toBeRequired();
  });

  it("htmlFor names the id, and a matching caller id does not warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Field label="Email" htmlFor="email">
        <Input id="email" />
      </Field>,
    );
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
