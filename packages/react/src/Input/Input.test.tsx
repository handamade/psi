import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Input } from "./Input.js";

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input aria-label="Name" />);
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
  });

  it("applies default size class (size32)", () => {
    const { container } = render(<Input />);
    const input = container.querySelector("input")!;
    expect(input.className).toContain("size32");
  });

  it("applies size class", () => {
    const sizes = [24, 32, 40, 48] as const;
    for (const size of sizes) {
      const { container, unmount } = render(<Input size={size} />);
      const input = container.querySelector("input")!;
      expect(input.className).toContain(`size${size}`);
      unmount();
    }
  });

  it("applies error class when error is true", () => {
    const { container } = render(<Input error />);
    const input = container.querySelector("input")!;
    expect(input.className).toContain("error");
  });

  it("does not apply error class by default", () => {
    const { container } = render(<Input />);
    const input = container.querySelector("input")!;
    expect(input.className).not.toContain("error");
  });

  it("supports disabled", () => {
    render(<Input disabled aria-label="Disabled" />);
    expect(screen.getByRole("textbox", { name: "Disabled" })).toBeDisabled();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("passes through native input attributes", () => {
    render(<Input placeholder="Enter name" type="email" data-testid="inp" />);
    const input = screen.getByTestId("inp");
    expect(input).toHaveAttribute("placeholder", "Enter name");
    expect(input).toHaveAttribute("type", "email");
  });

  it("applies custom className", () => {
    const { container } = render(<Input className="custom" />);
    const input = container.querySelector("input")!;
    expect(input.className).toContain("custom");
  });
});
