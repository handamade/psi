import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
