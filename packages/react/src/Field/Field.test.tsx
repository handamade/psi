import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field } from "./Field.js";
import { Input } from "../Input/Input.js";
import { Checkbox } from "../Checkbox/Checkbox.js";

describe("Field", () => {
  it.fails("associates the label with the wrapped control", () => {
    // flipped to it() in Task 3 — Input doesn't consume FieldContext yet
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
