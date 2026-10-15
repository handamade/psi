import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Checkbox } from "./Checkbox.js";
import { Field } from "../Field/Field.js";

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

describe("Checkbox indeterminate (D103)", () => {
  const box = () => screen.getByRole("checkbox", { name: "Select all" }) as HTMLInputElement;

  it("sets the DOM property from the prop, and false clears it", () => {
    const { rerender } = render(<Checkbox indeterminate>Select all</Checkbox>);
    expect(box().indeterminate).toBe(true);
    rerender(<Checkbox indeterminate={false}>Select all</Checkbox>);
    expect(box().indeterminate).toBe(false);
  });

  it("restores the property after a click clears it, while the prop stays true", async () => {
    const { rerender } = render(<Checkbox indeterminate onChange={() => {}}>Select all</Checkbox>);
    await userEvent.click(box());
    expect(box().indeterminate).toBe(false); // the browser cleared it
    rerender(<Checkbox indeterminate onChange={() => {}}>Select all</Checkbox>);
    expect(box().indeterminate).toBe(true);
  });

  it("still forwards its ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox ref={ref} indeterminate>Select all</Checkbox>);
    expect(ref.current).toBe(box());
    expect(ref.current?.indeterminate).toBe(true);
  });

  it("leaves the property alone when the prop is not passed, so a ref-set state survives re-renders", () => {
    const ref = createRef<HTMLInputElement>();
    const { rerender } = render(<Checkbox ref={ref}>Select all</Checkbox>);
    ref.current!.indeterminate = true; // the pre-D103 workaround
    rerender(<Checkbox ref={ref} checked={false} onChange={() => {}}>Select all</Checkbox>);
    expect(ref.current!.indeterminate).toBe(true);
  });

  it("draws an 8 by 2px dash after the checked rules", () => {
    const css = readFileSync(join(import.meta.dirname, "checkbox.module.css"), "utf8");
    const dash = /\.input:indeterminate\s*\+\s*\.indicator::after\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(dash).toMatch(/width:\s*8px;/);
    expect(dash).toMatch(/height:\s*2px;/);
    expect(css.indexOf(".input:indeterminate + .indicator")).toBeGreaterThan(
      css.indexOf(".input:checked + .indicator::after"),
    );
  });
});

describe("Checkbox in error (D108)", () => {
  const group = (error?: string, extra: Record<string, unknown> = {}) =>
    render(
      <Field group label="Notify me" error={error} required>
        <Checkbox {...extra}>Email</Checkbox>
        <Checkbox>SMS</Checkbox>
      </Field>,
    );

  it("takes aria-invalid, and not required, from an invalid group Field", () => {
    group("Pick at least one.");
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box).toHaveAttribute("aria-invalid", "true");
      expect(box).not.toBeRequired();
    }
  });

  it("is not aria-invalid in a valid group Field", () => {
    group();
    for (const box of screen.getAllByRole("checkbox")) expect(box).not.toHaveAttribute("aria-invalid");
  });

  it("keeps an aria-invalid the consumer passes", () => {
    group("Pick at least one.", { "aria-invalid": false });
    expect(screen.getByRole("checkbox", { name: "Email" })).toHaveAttribute("aria-invalid", "false");
  });

  it("draws the error outline on an unchecked, aria-invalid box", () => {
    const css = readFileSync(join(import.meta.dirname, "checkbox.module.css"), "utf8");
    const rule =
      /\.input\[aria-invalid="true"\]:not\(:checked\):not\(:indeterminate\)\s*\+\s*\.indicator\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/border-color:\s*var\(--psi-checkbox-box-border-error\)/);
  });
});
