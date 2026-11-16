import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PageHeading } from "./PageHeading.js";

const css = () => readFileSync(join(import.meta.dirname, "page-heading.module.css"), "utf8");
const rule = (sel: string) => new RegExp(`\\.${sel}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? "";

describe("PageHeading (D118)", () => {
  it("renders the page's h1 with its text", () => {
    render(<PageHeading>Sales</PageHeading>);
    expect(screen.getByRole("heading", { level: 1, name: "Sales" })).toBeInTheDocument();
  });

  it("binds its two tokens and has no margin", () => {
    const { container } = render(<PageHeading>Sales</PageHeading>);
    expect((container.firstElementChild as HTMLElement).className).toMatch(/pageHeading/);
    const r = rule("pageHeading");
    expect(r).toMatch(/margin:\s*0;/);
    expect(r).toMatch(/font:\s*var\(--psi-page-heading-font\);/);
    expect(r).toMatch(/color:\s*var\(--psi-page-heading-fg\);/);
  });

  it("passes host props, className and ref through", () => {
    const ref = createRef<HTMLHeadingElement>();
    const { container } = render(
      <PageHeading ref={ref} id="title" className="mine">
        Sales
      </PageHeading>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(el);
    expect(el).toHaveAttribute("id", "title");
    expect(el.className).toMatch(/mine/);
  });
});
