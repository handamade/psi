import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { Field } from "./Field.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
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

  it("the top layout's rules are unchanged", () => {
    expect(/\.field\s*\{([^}]*)\}/.exec(css())![1]).not.toMatch(/grid-template-columns/);
  });
});
