import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { InlineAlert } from "./InlineAlert.js";

describe("InlineAlert", () => {
  it("renders its children and title", () => {
    render(<InlineAlert title="Scheduled maintenance">Saturday 02:00 to 04:00 UTC.</InlineAlert>);
    expect(screen.getByText("Scheduled maintenance")).toBeInTheDocument();
    expect(screen.getByText("Saturday 02:00 to 04:00 UTC.")).toBeInTheDocument();
  });

  it("renders the title as a strong element before the children", () => {
    render(<InlineAlert title="Heads up">body</InlineAlert>);
    expect(screen.getByText("Heads up").tagName).toBe("STRONG");
  });

  it("renders without a title", () => {
    const { container } = render(<InlineAlert>Only a body</InlineAlert>);
    expect(container.querySelector("strong")).toBeNull();
    expect(screen.getByText("Only a body")).toBeInTheDocument();
  });

  it("defaults to the neutral variant", () => {
    const { container } = render(<InlineAlert>msg</InlineAlert>);
    expect(container.firstChild).toHaveAttribute("data-variant", "neutral");
    expect(container.firstChild).toHaveAttribute("data-psi-inline-alert");
  });

  it.each(["neutral", "success", "warning", "danger"] as const)(
    "carries variant %s as a data attribute",
    (variant) => {
      const { container } = render(<InlineAlert variant={variant}>msg</InlineAlert>);
      expect(container.firstChild).toHaveAttribute("data-variant", variant);
    },
  );

  it.each([
    ["success", "Success:"],
    ["warning", "Warning:"],
    ["danger", "Error:"],
  ] as const)("carries the %s meaning in text, not colour alone", (variant, word) => {
    render(<InlineAlert variant={variant}>msg</InlineAlert>);
    const el = screen.getByText(word);
    expect(el).toHaveClass("psi-sr-only");
  });

  it("gives neutral no status word", () => {
    render(<InlineAlert variant="neutral">msg</InlineAlert>);
    expect(screen.queryByText(/^(Success|Warning|Error):$/)).toBeNull();
  });

  it("replaces the status word when statusLabel is a string (D83)", () => {
    render(<InlineAlert variant="danger" statusLabel="Fehler:">msg</InlineAlert>);
    expect(screen.getByText("Fehler:")).toBeInTheDocument();
    expect(screen.queryByText("Error:")).toBeNull();
  });

  it("drops the status word when statusLabel is null (D83)", () => {
    render(<InlineAlert variant="danger" statusLabel={null}>msg</InlineAlert>);
    expect(screen.queryByText("Error:")).toBeNull();
    expect(document.querySelector(".psi-sr-only")).toBeNull();
  });

  it("renders the action slot", () => {
    render(<InlineAlert action={<button type="button">Review</button>}>msg</InlineAlert>);
    expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument();
  });

  it("hides the status icon from assistive tech", () => {
    const { container } = render(<InlineAlert variant="danger">msg</InlineAlert>);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("is not a live region: no role and no aria-live anywhere in the tree", () => {
    const { container } = render(
      <InlineAlert
        variant="danger"
        title="Payment failed"
        action={<button type="button">Retry</button>}
      >
        msg
      </InlineAlert>,
    );
    expect(container.querySelector("[role]")).toBeNull();
    expect(container.querySelector("[aria-live]")).toBeNull();
  });

  it("is not role=\"alert\", despite its name", () => {
    const { container } = render(<InlineAlert variant="danger">msg</InlineAlert>);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders no dismiss button", () => {
    render(<InlineAlert>msg</InlineAlert>);
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });

  it("merges className rather than replacing it", () => {
    const { container } = render(<InlineAlert className="custom">msg</InlineAlert>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("custom");
    expect(el.className.split(" ").length).toBeGreaterThan(1);
  });

  it("forwards its ref to the root div", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<InlineAlert ref={ref}>msg</InlineAlert>);
    expect(ref.current).toBe(container.firstChild);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("spreads rest props onto the root", () => {
    render(<InlineAlert data-testid="alert" id="b1">msg</InlineAlert>);
    const el = screen.getByTestId("alert");
    expect(el).toHaveAttribute("id", "b1");
    expect(el).toHaveAttribute("data-psi-inline-alert");
  });

  it("does not let rest props overwrite its own data attributes", () => {
    render(<InlineAlert variant="success" data-variant="danger" data-testid="alert">msg</InlineAlert>);
    expect(screen.getByTestId("alert")).toHaveAttribute("data-variant", "success");
  });
});
