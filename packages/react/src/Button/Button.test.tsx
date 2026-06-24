import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Button } from "./Button.js";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("applies variant class", () => {
    const { container } = render(<Button variant="accent">Go</Button>);
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("accent");
  });

  it("applies size class", () => {
    const { container } = render(<Button size={40}>Go</Button>);
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("size40");
  });

  it("defaults to neutral variant and size 32", () => {
    const { container } = render(<Button>Default</Button>);
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("neutral");
    expect(btn.className).toContain("size32");
  });

  it("handles click", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await user.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("supports disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Disabled" });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current!.textContent).toBe("Ref");
  });

  it("passes through native button attributes", () => {
    render(<Button type="submit" data-testid="btn">Submit</Button>);
    const btn = screen.getByTestId("btn");
    expect(btn).toHaveAttribute("type", "submit");
  });

  it("applies all variant classes without error", () => {
    const variants = [
      "accent",
      "accent-subtle",
      "neutral",
      "neutral-subtle",
      "ghost",
      "danger",
      "danger-subtle",
    ] as const;
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>);
      const btn = screen.getByRole("button", { name: variant });
      expect(btn).toBeInTheDocument();
      unmount();
    }
  });

  it("applies all size classes without error", () => {
    const sizes = [24, 32, 40, 48] as const;
    for (const size of sizes) {
      const { unmount } = render(<Button size={size}>Size {size}</Button>);
      const btn = screen.getByRole("button", { name: `Size ${size}` });
      expect(btn).toBeInTheDocument();
      unmount();
    }
  });
});
