import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render } from "@testing-library/react";
import { Skeleton } from "./Skeleton.js";

describe("Skeleton", () => {
  it("is always aria-hidden", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstChild).toHaveAttribute("data-psi-skeleton");
  });

  it("defaults to one text line", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute("data-variant", "text");
    expect(container.querySelectorAll("span")).toHaveLength(1);
  });

  it("renders `lines` line elements", () => {
    const { container } = render(<Skeleton lines={3} />);
    expect(container.querySelectorAll("span")).toHaveLength(3);
  });

  it("block carries data-size, default 40", () => {
    const { container } = render(<Skeleton variant="block" />);
    expect(container.firstChild).toHaveAttribute("data-variant", "block");
    expect(container.firstChild).toHaveAttribute("data-size", "40");
    expect(container.querySelectorAll("span")).toHaveLength(0);
  });

  it("block takes a size from the size scale", () => {
    const { container } = render(<Skeleton variant="block" size={24} />);
    expect(container.firstChild).toHaveAttribute("data-size", "24");
  });

  it("text carries no data-size", () => {
    const { container } = render(<Skeleton lines={2} size={48} />);
    expect(container.firstChild).not.toHaveAttribute("data-size");
  });

  it("is not a live region: no role and no aria-live anywhere in the tree", () => {
    const { container } = render(<Skeleton lines={3} />);
    const all = [container.firstChild as Element, ...Array.from(container.querySelectorAll("*"))];
    for (const el of all) {
      expect(el.hasAttribute("role")).toBe(false);
      expect(el.hasAttribute("aria-live")).toBe(false);
    }
    const block = render(<Skeleton variant="block" />).container.firstChild as Element;
    expect(block.hasAttribute("role")).toBe(false);
    expect(block.hasAttribute("aria-live")).toBe(false);
  });

  it("merges className", () => {
    const { container } = render(<Skeleton className="mine" />);
    expect(container.firstChild).toHaveClass("mine");
    expect((container.firstChild as HTMLElement).className).toContain("skeleton");
  });

  it("forwards its ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Skeleton ref={ref} />);
    expect(ref.current).toBe(container.firstChild);
  });

  it("spreads rest props onto the root, but the component's own attributes win", () => {
    const { getByTestId } = render(<Skeleton data-testid="sk" aria-hidden="false" />);
    expect(getByTestId("sk")).toHaveAttribute("aria-hidden", "true");
  });
});
