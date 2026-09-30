import { createRef } from "react";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

describe("align and as (D87)", () => {
  it("align=\"end\" sets the end-alignment class; the default and center set none", () => {
    const { container, rerender } = render(<Toolbar align="end">x</Toolbar>);
    expect(container.firstElementChild!.className).toMatch(/alignEnd/);
    rerender(<Toolbar>x</Toolbar>);
    expect(container.firstElementChild!.className).not.toMatch(/alignEnd/);
    rerender(<Toolbar align="center">x</Toolbar>);
    expect(container.firstElementChild!.className).not.toMatch(/alignEnd/);
  });
  it("as=\"form\" renders a form landmark named by aria-label, with no role of its own", () => {
    const { getByRole } = render(<Toolbar as="form" aria-label="Filters">x</Toolbar>);
    const form = getByRole("form", { name: "Filters" });
    expect(form.tagName).toBe("FORM");
    expect(form.getAttribute("role")).toBeNull();
  });
  it("as=\"form\" submits through onSubmit, and forwards a ref to the form", () => {
    const onSubmit = vi.fn((e: { preventDefault(): void }) => e.preventDefault());
    const ref = createRef<HTMLDivElement | HTMLFormElement>();
    const { container } = render(
      <Toolbar as="form" aria-label="Filters" onSubmit={onSubmit} ref={ref}>
        <button type="submit">Find</button>
      </Toolbar>,
    );
    fireEvent.submit(container.querySelector("form")!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(ref.current).toBeInstanceOf(HTMLFormElement);
  });
  it("a labelled div is still a group", () => {
    const { getByRole } = render(<Toolbar aria-label="Filters" align="end">x</Toolbar>);
    expect(getByRole("group", { name: "Filters" }).tagName).toBe("DIV");
  });
});
