import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Panel } from "./Panel.js";

describe("Panel", () => {
  it("renders children", () => {
    render(<Panel><p>Body copy</p></Panel>);
    expect(screen.getByText("Body copy")).toBeInTheDocument();
  });
  it("applies the padding-16 class only when padding={16}", () => {
    const { container, rerender } = render(<Panel>x</Panel>);
    expect(container.firstElementChild!.className).not.toMatch(/padding16/);
    rerender(<Panel padding={16}>x</Panel>);
    expect(container.firstElementChild!.className).toMatch(/padding16/);
  });
  it("merges className and spreads host props", () => {
    const { container } = render(<Panel className="promo" data-x="1">x</Panel>);
    expect(container.firstElementChild!.className).toMatch(/promo/);
    expect(container.firstElementChild!.getAttribute("data-x")).toBe("1");
  });
});
