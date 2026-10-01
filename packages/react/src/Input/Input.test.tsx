import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("is reachable by Tab and associates its label", async () => {
    const user = userEvent.setup();
    render(
      <label>
        Name
        <Input size={32} />
      </label>,
    );
    await user.tab();
    expect(screen.getByLabelText("Name")).toHaveFocus();
    await user.keyboard("Dmytro");
    expect(screen.getByLabelText("Name")).toHaveValue("Dmytro");
  });

  it("passes type through to the native input", () => {
    render(<Input type="date" aria-label="From" />);
    expect(screen.getByLabelText("From")).toHaveAttribute("type", "date");
  });

  it("defaults type to text when no type prop is given", () => {
    render(<Input aria-label="Name" />);
    expect(screen.getByLabelText("Name")).toHaveAttribute("type", "text");
  });
});

describe("Input box model (D87)", () => {
  // jsdom does no layout, so this reads the rule; the height itself is
  // measured in a browser by apps/storybook/vr/filter-form.interaction.spec.ts.
  // Without border-box the border and the browser's own block padding land
  // outside the size token: every size measured 4px over (32 → 36).
  it("the base rule is border-box, so the size token is the rendered height", () => {
    const css = readFileSync(join(import.meta.dirname, "input.module.css"), "utf8");
    const base = /\.input\s*\{([^}]*)\}/.exec(css)![1];
    expect(base).toMatch(/box-sizing:\s*border-box;/);
  });
});
