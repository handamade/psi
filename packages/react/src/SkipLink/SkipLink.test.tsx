import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SkipLink } from "./SkipLink.js";

describe("SkipLink (D88)", () => {
  it("renders an anchor with its href, its text and the skip-link class", () => {
    render(<SkipLink href="#main">Skip to content</SkipLink>);
    const link = screen.getByRole("link", { name: "Skip to content" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "#main");
    expect(link.className).toMatch(/skipLink/);
  });

  it("merges className", () => {
    render(
      <SkipLink href="#main" className="mine">
        Skip
      </SkipLink>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveClass("mine");
    expect(link.className).toMatch(/skipLink/);
  });

  it("passes rest props and the ref to the anchor", () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <SkipLink href="#main" data-testid="skip" ref={ref}>
        Skip
      </SkipLink>,
    );
    expect(screen.getByTestId("skip")).toBe(ref.current);
    expect(ref.current?.tagName).toBe("A");
  });
});
