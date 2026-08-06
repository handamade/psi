import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toast } from "./Toast.js";

describe("Toast", () => {
  it("renders its children as the message", () => {
    render(<Toast>Transaction voided</Toast>);
    expect(screen.getByText("Transaction voided")).toBeInTheDocument();
  });

  it("defaults to the neutral variant", () => {
    const { container } = render(<Toast>msg</Toast>);
    expect(container.firstChild).toHaveAttribute("data-variant", "neutral");
  });

  it.each(["neutral", "success", "warning", "danger"] as const)(
    "carries variant %s as a data attribute",
    (variant) => {
      const { container } = render(<Toast variant={variant}>msg</Toast>);
      expect(container.firstChild).toHaveAttribute("data-variant", variant);
    },
  );

  it("renders a dismiss button only when onDismiss is provided", () => {
    const { rerender } = render(<Toast>msg</Toast>);
    expect(screen.queryByRole("button", { name: "Dismiss notification" })).toBeNull();

    rerender(<Toast onDismiss={() => {}}>msg</Toast>);
    expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeInTheDocument();
  });

  it("calls onDismiss exactly once per click", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Toast onDismiss={onDismiss}>msg</Toast>);

    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not remove itself when onDismiss fires — the owner disposes (D50/D53)", async () => {
    const user = userEvent.setup();
    render(<Toast onDismiss={() => {}}>still here</Toast>);

    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.getByText("still here")).toBeInTheDocument();
  });

  it("renders the action slot", () => {
    render(<Toast action={<button type="button">Undo</button>}>msg</Toast>);
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("hides the status icon from assistive tech", () => {
    const { container } = render(<Toast variant="danger">msg</Toast>);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it.each([
    ["success", "Success:"],
    ["warning", "Warning:"],
    ["danger", "Error:"],
  ] as const)("carries the %s meaning in text, not colour alone", (variant, prefix) => {
    render(<Toast variant={variant}>msg</Toast>);
    expect(screen.getByText(prefix)).toBeInTheDocument();
  });

  it("gives neutral no textual prefix — there is no status to announce", () => {
    render(<Toast variant="neutral">msg</Toast>);
    expect(screen.queryByText(/^(Success|Warning|Error):$/)).toBeNull();
  });

  it("merges className rather than replacing it", () => {
    const { container } = render(<Toast className="custom">msg</Toast>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("custom");
    expect(el.className.split(" ").length).toBeGreaterThan(1);
  });

  it("forwards ref to the underlying div", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Toast ref={ref}>msg</Toast>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
