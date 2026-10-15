import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Text } from "./Text.js";

const css = () => readFileSync(join(import.meta.dirname, "text.module.css"), "utf8");
const rule = (sel: string) => new RegExp(`\\.${sel}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? "";

describe("Text (D109)", () => {
  it("renders a paragraph by default, with no margin", () => {
    const { container } = render(<Text>Hello</Text>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.tagName).toBe("P");
    expect(el.className).toMatch(/text/);
    expect(rule("text")).toMatch(/margin:\s*0;/);
    expect(rule("text")).toMatch(/color:\s*var\(--psi-text-fg\)/);
  });

  it("renders the element `as` names, independent of size", () => {
    render(<Text as="h3" size={16} weight="medium">Nothing here</Text>);
    expect(screen.getByRole("heading", { level: 3, name: "Nothing here" })).toBeInTheDocument();
  });

  it("maps size and weight onto the matching text style", () => {
    const styles: Array<[12 | 14 | 16 | 18, "regular" | "medium", string]> = [
      [12, "regular", "12-16-regular"], [12, "medium", "12-16-medium"],
      [14, "regular", "14-20-regular"], [14, "medium", "14-20-medium"],
      [16, "regular", "16-24-regular"], [16, "medium", "16-24-medium"],
      [18, "regular", "18-28-regular"], [18, "medium", "18-28-medium"],
    ];
    for (const [size, weight, style] of styles) {
      const { container, unmount } = render(<Text size={size} weight={weight}>x</Text>);
      const cls = `s${size}${weight === "medium" ? "Medium" : "Regular"}`;
      expect((container.firstElementChild as HTMLElement).className).toMatch(new RegExp(cls));
      expect(rule(cls), cls).toMatch(new RegExp(`font:\\s*var\\(--psi-text-${style}\\)`));
      unmount();
    }
  });

  it("defaults to 14 regular, primary tone", () => {
    const { container } = render(<Text>x</Text>);
    const cls = (container.firstElementChild as HTMLElement).className;
    expect(cls).toMatch(/s14Regular/);
    expect(cls).not.toMatch(/secondary/);
  });

  it("the secondary tone binds the secondary foreground", () => {
    const { container } = render(<Text tone="secondary">x</Text>);
    expect((container.firstElementChild as HTMLElement).className).toMatch(/secondary/);
    expect(rule("secondary")).toMatch(/color:\s*var\(--psi-text-fg-secondary\)/);
  });

  it("passes host props, className and ref through", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<Text ref={ref} id="t" className="mine">x</Text>);
    const el = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(el);
    expect(el).toHaveAttribute("id", "t");
    expect(el.className).toMatch(/mine/);
  });
});
