import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Switch } from "./Switch.js";
import { Field } from "../Field/Field.js";

describe("Switch", () => {
  it("renders a switch with label text", () => {
    render(<Switch>Dark mode</Switch>);
    expect(
      screen.getByRole("switch", { name: "Dark mode" }),
    ).toBeInTheDocument();
  });

  it("toggles checked state via click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch onChange={onChange}>Toggle</Switch>);
    const sw = screen.getByRole("switch", { name: "Toggle" });
    expect(sw).not.toBeChecked();
    await user.click(sw);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("renders checked when controlled", () => {
    render(
      <Switch checked onChange={() => {}}>
        On
      </Switch>,
    );
    expect(screen.getByRole("switch", { name: "On" })).toBeChecked();
  });

  it("supports disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Switch disabled onChange={onChange}>
        Disabled
      </Switch>,
    );
    const sw = screen.getByRole("switch", { name: "Disabled" });
    expect(sw).toBeDisabled();
    await user.click(sw);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Switch ref={ref}>Ref</Switch>);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current!.type).toBe("checkbox");
  });

  it("has role=switch", () => {
    render(<Switch>Mode</Switch>);
    const sw = screen.getByRole("switch");
    expect(sw).toBeInTheDocument();
  });

  it("applies disabled class to label", () => {
    const { container } = render(<Switch disabled>Disabled</Switch>);
    const label = container.querySelector("label")!;
    expect(label.className).toContain("disabled");
  });

  it("toggles with Space via keyboard", async () => {
    const user = userEvent.setup();
    render(<Switch>Notify</Switch>);
    await user.tab();
    expect(screen.getByRole("switch")).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("hides the native input via the shared psi-sr-only utility, not a private class (D80)", () => {
    const { container } = render(<Switch />);
    const input = container.querySelector("input")!;
    const classes = input.className.split(" ");
    expect(classes).toContain("psi-sr-only");
    expect(classes).not.toContain("undefined");
  });
});

describe("Switch in a Field that is not a group (D135)", () => {
  it("is named by the Field's label and its own, described by the message, invalid and required", () => {
    render(
      <Field label="Notifications" error="Choose one." required>
        <Switch>Email me weekly</Switch>
      </Field>,
    );
    const box = screen.getByRole("switch", { name: /^Notifications.*Email me weekly$/ });
    expect(box).toHaveAttribute("aria-describedby", screen.getByText("Choose one.").id);
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toBeRequired();
  });

  it("without a Field label keeps its own name and still takes the message", () => {
    render(
      <Field error="You must accept the terms.">
        <Switch>I accept the terms</Switch>
      </Field>,
    );
    const box = screen.getByRole("switch", { name: "I accept the terms" });
    expect(box).toHaveAccessibleDescription("You must accept the terms.");
    expect(box).toHaveAttribute("aria-invalid", "true");
  });

  it("in a valid Field is neither invalid nor required", () => {
    render(
      <Field label="Notifications" description="Weekly.">
        <Switch>Email me weekly</Switch>
      </Field>,
    );
    const box = screen.getByRole("switch");
    expect(box).not.toHaveAttribute("aria-invalid");
    expect(box).not.toBeRequired();
  });
});

describe("Switch in a group Field (D135)", () => {
  it("takes aria-invalid, and not required, from an invalid group Field, as Checkbox does", () => {
    render(
      <Field group label="Alerts" error="Pick one." required>
        <Switch>Push</Switch>
        <Switch>SMS</Switch>
      </Field>,
    );
    for (const sw of screen.getAllByRole("switch")) {
      expect(sw).toHaveAttribute("aria-invalid", "true");
      expect(sw).not.toBeRequired();
      expect(sw).not.toHaveAttribute("id");
    }
  });
});
