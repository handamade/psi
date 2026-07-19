import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
