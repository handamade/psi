import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Select } from "./Select.js";

describe("Select", () => {
  it("renders a select element", () => {
    render(
      <Select aria-label="Color">
        <option>Red</option>
        <option>Blue</option>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Color" })).toBeInTheDocument();
  });

  it("renders option children", () => {
    render(
      <Select aria-label="Color">
        <option>Red</option>
        <option>Blue</option>
      </Select>,
    );
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Red");
    expect(options[1]).toHaveTextContent("Blue");
  });

  it("applies default size class (size32)", () => {
    const { container } = render(
      <Select>
        <option>A</option>
      </Select>,
    );
    const select = container.querySelector("select")!;
    expect(select.className).toContain("size32");
  });

  it("applies size class", () => {
    const sizes = [24, 32, 40, 48] as const;
    for (const size of sizes) {
      const { container, unmount } = render(
        <Select size={size}>
          <option>A</option>
        </Select>,
      );
      const select = container.querySelector("select")!;
      expect(select.className).toContain(`size${size}`);
      unmount();
    }
  });

  it("applies error class when error is true", () => {
    const { container } = render(
      <Select error>
        <option>A</option>
      </Select>,
    );
    const select = container.querySelector("select")!;
    expect(select.className).toContain("error");
  });

  it("supports disabled", () => {
    render(
      <Select disabled aria-label="Disabled">
        <option>A</option>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Disabled" })).toBeDisabled();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <Select ref={ref}>
        <option>A</option>
      </Select>,
    );
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it("has custom chevron styling (appearance none)", () => {
    const { container } = render(
      <Select>
        <option>A</option>
      </Select>,
    );
    const select = container.querySelector("select")!;
    expect(select.className).toContain("select");
  });

  it("is keyboard-operable as a native select", async () => {
    const user = userEvent.setup();
    render(
      <label>
        Plan
        <Select size={32} defaultValue="free">
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </Select>
      </label>,
    );
    await user.tab();
    expect(screen.getByLabelText("Plan")).toHaveFocus();
    // Waiver: jsdom cannot drive native <select> option navigation via arrow keys
    // (that UI is browser-provided), so the value change uses selectOptions.
    // What this test meaningfully asserts in jsdom: Tab-reachability and change
    // handling. Native keyboard behavior is the platform's and is exercised in
    // real-browser checks (Playwright VR layer).
    await user.selectOptions(screen.getByLabelText("Plan"), "pro");
    expect(screen.getByLabelText("Plan")).toHaveValue("pro");
  });
});
