import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { createRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Stack } from "./Stack.js";

const css = () => readFileSync(join(import.meta.dirname, "stack.module.css"), "utf8");
const rule = (sel: string) => new RegExp(`\\.${sel}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? "";

describe("Stack (D109)", () => {
  it("is a div with no role, laid out as a column", () => {
    const { container } = render(<Stack><span>A</span><span>B</span></Stack>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root).not.toHaveAttribute("role");
    expect(root.className).toMatch(/stack/);
    expect(rule("stack")).toMatch(/display:\s*flex;/);
    expect(rule("stack")).toMatch(/flex-direction:\s*column;/);
  });

  it("defaults to gap 16 and stretch, and takes the other gaps and aligns", () => {
    const { container, rerender } = render(<Stack>x</Stack>);
    const root = () => container.firstElementChild as HTMLElement;
    expect(root().className).toMatch(/gap16/);
    expect(root().className).not.toMatch(/align/);
    rerender(<Stack gap={8} align="start">x</Stack>);
    expect(root().className).toMatch(/gap8/);
    expect(root().className).toMatch(/alignStart/);
  });

  it("binds the space scale for every gap", () => {
    for (const g of [4, 8, 12, 16, 24, 32]) {
      expect(rule(`gap${g}`), `gap${g}`).toMatch(new RegExp(`gap:\\s*var\\(--psi-space-${g}\\)`));
    }
    expect(rule("alignStart")).toMatch(/align-items:\s*flex-start/);
    expect(rule("alignCenter")).toMatch(/align-items:\s*center/);
    expect(rule("alignEnd")).toMatch(/align-items:\s*flex-end/);
  });

  it("passes host props, className and ref through", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Stack ref={ref} id="s" className="mine" aria-label="Filters">x</Stack>);
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("id", "s");
    expect(root).toHaveAttribute("aria-label", "Filters");
    expect(root.className).toMatch(/mine/);
  });
});
