import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tag } from "./Tag.js";

describe("Tag", () => {
  it("renders children", () => {
    render(<Tag>Label</Tag>);
    expect(screen.getByText("Label")).toBeInTheDocument();
  });

  it("applies variant class", () => {
    const variants = [
      "neutral",
      "accent",
      "success",
      "warning",
      "danger",
    ] as const;
    for (const variant of variants) {
      const { container, unmount } = render(
        <Tag variant={variant}>{variant}</Tag>,
      );
      const tag = container.querySelector("span")!;
      expect(tag.className).toContain(variant);
      unmount();
    }
  });

  it("applies subtle variant class", () => {
    const { container } = render(
      <Tag variant="accent" subtle>
        Subtle
      </Tag>,
    );
    const tag = container.querySelector("span")!;
    expect(tag.className).toContain("accentSubtle");
  });

  it("does not show dismiss button by default", () => {
    render(<Tag>Label</Tag>);
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });

  it("shows dismiss button when onDismiss is provided", () => {
    render(<Tag onDismiss={() => {}}>Label</Tag>);
    expect(
      screen.getByRole("button", { name: "Dismiss" }),
    ).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Tag onDismiss={onDismiss}>Dismissible</Tag>);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("defaults to neutral variant", () => {
    const { container } = render(<Tag>Default</Tag>);
    const tag = container.querySelector("span")!;
    expect(tag.className).toContain("neutral");
  });
});
