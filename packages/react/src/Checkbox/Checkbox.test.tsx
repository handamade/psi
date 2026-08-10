import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Checkbox } from "./Checkbox.js";

describe("Checkbox", () => {
  it("renders a checkbox with label text", () => {
    render(<Checkbox>Accept terms</Checkbox>);
    expect(
      screen.getByRole("checkbox", { name: "Accept terms" }),
    ).toBeInTheDocument();
  });

  it("toggles checked state via click on label", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox onChange={onChange}>Toggle</Checkbox>);
    const checkbox = screen.getByRole("checkbox", { name: "Toggle" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("renders checked when controlled", () => {
    render(
      <Checkbox checked onChange={() => {}}>
        Checked
      </Checkbox>,
    );
    expect(screen.getByRole("checkbox", { name: "Checked" })).toBeChecked();
  });

  it("supports disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Checkbox disabled onChange={onChange}>
        Disabled
      </Checkbox>,
    );
    const checkbox = screen.getByRole("checkbox", { name: "Disabled" });
    expect(checkbox).toBeDisabled();
    await user.click(checkbox);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox ref={ref}>Ref</Checkbox>);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current!.type).toBe("checkbox");
  });

  it("applies disabled class to label", () => {
    const { container } = render(<Checkbox disabled>Disabled</Checkbox>);
    const label = container.querySelector("label")!;
    expect(label.className).toContain("disabled");
  });

  it("toggles with Space via keyboard", async () => {
    const user = userEvent.setup();
    render(<Checkbox>Beta</Checkbox>);
    await user.tab();
    expect(screen.getByRole("checkbox")).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("accepts aria-label as its own declared prop for label-less use (D60)", () => {
    render(<Checkbox aria-label="Select transaction 2026-08-05 Acme Corp" />);
    expect(
      screen.getByRole("checkbox", { name: "Select transaction 2026-08-05 Acme Corp" }),
    ).toBeTruthy();
  });

  it("renders no label text when only aria-label is given", () => {
    const { container } = render(<Checkbox aria-label="Select row" />);
    expect(container.textContent).toBe("");
  });

  it("hides the native input via the shared psi-sr-only utility, not a private class (D80)", () => {
    const { container } = render(<Checkbox />);
    const input = container.querySelector("input")!;
    const classes = input.className.split(" ");
    expect(classes).toContain("psi-sr-only");
    expect(classes).not.toContain("undefined");
  });
});
