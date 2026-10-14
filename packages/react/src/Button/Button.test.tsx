import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("renders the outline variant", () => {
    render(<Button variant="outline">Ghost CTA</Button>);
    expect(screen.getByRole("button", { name: "Ghost CTA" }).className).toMatch(/outline/);
  });

  it("renders an anchor when href is provided", () => {
    render(<Button href="/docs" variant="accent">Docs</Button>);
    const a = screen.getByRole("link", { name: "Docs" });
    expect(a).toHaveAttribute("href", "/docs");
  });

  it("disabled anchor is non-focusable and suppresses activation (D33)", async () => {
    const onClick = vi.fn();
    render(<Button href="/docs" disabled onClick={onClick}>Docs</Button>);
    const a = screen.getByText("Docs");
    expect(a).not.toHaveAttribute("href");
    expect(a).toHaveAttribute("aria-disabled", "true");
    a.focus();
    expect(a).not.toHaveFocus();
    await userEvent.click(a).catch(() => {});
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Button icon size (D97)", () => {
  // jsdom does no layout, so these read the rules; the rendered size is
  // measured in a browser by apps/storybook/vr/button-icon.interaction.spec.ts.
  const css = readFileSync(join(import.meta.dirname, "button.module.css"), "utf8");
  const rule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
    return new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1];
  };
  for (const n of [24, 32, 40, 48] as const) {
    it(`sizes a direct svg child at size ${n} by its token, and keeps it from shrinking`, () => {
      const body = rule(`.size${n} > svg`);
      expect(body).toMatch(new RegExp(`inline-size:\\s*var\\(--psi-button-${n}-icon-size\\);`));
      expect(body).toMatch(new RegExp(`block-size:\\s*var\\(--psi-button-${n}-icon-size\\);`));
      expect(body).toMatch(/flex:\s*none;/);
    });
  }
});
