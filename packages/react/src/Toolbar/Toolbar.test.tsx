import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toolbar } from "./Toolbar.js";

describe("Toolbar", () => {
  it("renders children", () => {
    const { container } = render(<Toolbar><button>A</button><button>B</button></Toolbar>);
    expect(container.firstElementChild!.querySelectorAll("button")).toHaveLength(2);
  });
  it("has no role without aria-label", () => {
    const { container } = render(<Toolbar>x</Toolbar>);
    expect(container.firstElementChild!.getAttribute("role")).toBeNull();
  });
  it("announces as a named group when labeled", () => {
    const { getByRole } = render(<Toolbar aria-label="Filters">x</Toolbar>);
    expect(getByRole("group", { name: "Filters" })).toBeTruthy();
  });
  it("applies the gap class (default 8, explicit 16)", () => {
    const { container, rerender } = render(<Toolbar>x</Toolbar>);
    expect(container.firstElementChild!.className).toMatch(/gap8/);
    rerender(<Toolbar gap={16}>x</Toolbar>);
    expect(container.firstElementChild!.className).toMatch(/gap16/);
  });
});
