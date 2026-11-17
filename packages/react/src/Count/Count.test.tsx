import { createRef } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Count } from "./Count.js";

describe("Count (D124)", () => {
  it("renders the value as text", () => {
    render(<Count value={238} data-testid="c" />);
    expect(screen.getByTestId("c")).toHaveTextContent(/^238$/);
  });

  it("caps at 999 by default: 999 stays, 1000 shows 999+", () => {
    const { rerender } = render(<Count value={999} data-testid="c" />);
    expect(screen.getByTestId("c")).toHaveTextContent(/^999$/);
    rerender(<Count value={1000} data-testid="c" />);
    expect(screen.getByTestId("c")).toHaveTextContent(/^999\+$/);
  });

  it("takes a custom cap", () => {
    render(<Count value={100} max={99} data-testid="c" />);
    expect(screen.getByTestId("c")).toHaveTextContent(/^99\+$/);
  });

  it("is neutral by default, attention on request", () => {
    const { rerender } = render(<Count value={1} data-testid="c" />);
    expect(screen.getByTestId("c").className).toMatch(/neutral/);
    rerender(<Count value={1} tone="attention" data-testid="c" />);
    expect(screen.getByTestId("c").className).toMatch(/attention/);
    expect(screen.getByTestId("c").className).not.toMatch(/neutral/);
  });

  it("is never a live region: no role, no aria-live", () => {
    render(<Count value={3} tone="attention" data-testid="c" />);
    const el = screen.getByTestId("c");
    expect(el).not.toHaveAttribute("role");
    expect(el).not.toHaveAttribute("aria-live");
    expect(el.querySelector("[aria-live],[role]")).toBeNull();
  });

  it("with label: the number is aria-hidden and the label is screen-reader text", () => {
    render(<Count value={4} tone="attention" label="4 stuck" data-testid="c" />);
    const el = screen.getByTestId("c");
    const hidden = el.querySelector('[aria-hidden="true"]');
    expect(hidden).toHaveTextContent(/^4$/);
    const sr = el.querySelector(".psi-sr-only");
    expect(sr).toHaveTextContent(/^4 stuck$/);
  });

  it("without label renders no screen-reader span", () => {
    render(<Count value={4} data-testid="c" />);
    expect(screen.getByTestId("c").querySelector(".psi-sr-only")).toBeNull();
  });

  it("forwards ref and merges className onto the span", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Count value={1} className="mine" ref={ref} data-testid="c" />);
    const el = screen.getByTestId("c");
    expect(el).toBe(ref.current);
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("mine");
    expect(el.className).toMatch(/count/);
  });
});
