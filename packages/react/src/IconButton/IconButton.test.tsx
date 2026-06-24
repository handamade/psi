import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { IconButton } from "./IconButton.js";

const StarIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 0l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" />
  </svg>
);

describe("IconButton", () => {
  it("renders with aria-label", () => {
    render(
      <IconButton aria-label="Favorite">
        <StarIcon />
      </IconButton>,
    );
    expect(
      screen.getByRole("button", { name: "Favorite" }),
    ).toBeInTheDocument();
  });

  it("applies variant class", () => {
    const { container } = render(
      <IconButton variant="accent" aria-label="Action">
        <StarIcon />
      </IconButton>,
    );
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("accent");
  });

  it("applies size class", () => {
    const { container } = render(
      <IconButton size={40} aria-label="Action">
        <StarIcon />
      </IconButton>,
    );
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("size40");
  });

  it("is square (has iconButton base class)", () => {
    const { container } = render(
      <IconButton aria-label="Action">
        <StarIcon />
      </IconButton>,
    );
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("iconButton");
  });

  it("defaults to neutral variant and size 32", () => {
    const { container } = render(
      <IconButton aria-label="Default">
        <StarIcon />
      </IconButton>,
    );
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("neutral");
    expect(btn.className).toContain("size32");
  });

  it("handles click", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Click" onClick={onClick}>
        <StarIcon />
      </IconButton>,
    );
    await user.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("supports disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Disabled" disabled onClick={onClick}>
        <StarIcon />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Disabled" });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <IconButton aria-label="Ref" ref={ref}>
        <StarIcon />
      </IconButton>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("applies all variant classes without error", () => {
    const variants = ["accent", "neutral", "ghost", "danger"] as const;
    for (const variant of variants) {
      const { unmount } = render(
        <IconButton variant={variant} aria-label={variant}>
          <StarIcon />
        </IconButton>,
      );
      expect(
        screen.getByRole("button", { name: variant }),
      ).toBeInTheDocument();
      unmount();
    }
  });

  it("applies all size classes without error", () => {
    const sizes = [24, 32, 40, 48] as const;
    for (const size of sizes) {
      const { unmount } = render(
        <IconButton size={size} aria-label={`Size ${size}`}>
          <StarIcon />
        </IconButton>,
      );
      expect(
        screen.getByRole("button", { name: `Size ${size}` }),
      ).toBeInTheDocument();
      unmount();
    }
  });
});
