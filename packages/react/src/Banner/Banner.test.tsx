import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Banner } from "./Banner.js";

describe("Banner", () => {
  it("renders its children and title", () => {
    render(<Banner title="Scheduled maintenance">Saturday 02:00 to 04:00 UTC.</Banner>);
    expect(screen.getByText("Scheduled maintenance")).toBeInTheDocument();
    expect(screen.getByText("Saturday 02:00 to 04:00 UTC.")).toBeInTheDocument();
  });

  it("renders the title as a strong element before the children", () => {
    render(<Banner title="Heads up">body</Banner>);
    expect(screen.getByText("Heads up").tagName).toBe("STRONG");
  });

  it("renders without a title", () => {
    const { container } = render(<Banner>Only a body</Banner>);
    expect(container.querySelector("strong")).toBeNull();
    expect(screen.getByText("Only a body")).toBeInTheDocument();
  });

  it("defaults to the neutral variant", () => {
    const { container } = render(<Banner>msg</Banner>);
    expect(container.firstChild).toHaveAttribute("data-variant", "neutral");
    expect(container.firstChild).toHaveAttribute("data-psi-banner");
  });

  it.each(["neutral", "success", "warning", "danger"] as const)(
    "carries variant %s as a data attribute",
    (variant) => {
      const { container } = render(<Banner variant={variant}>msg</Banner>);
      expect(container.firstChild).toHaveAttribute("data-variant", variant);
    },
  );

  it.each([
    ["success", "Success:"],
    ["warning", "Warning:"],
    ["danger", "Error:"],
  ] as const)("carries the %s meaning in text, not colour alone", (variant, word) => {
    render(<Banner variant={variant}>msg</Banner>);
    const el = screen.getByText(word);
    expect(el).toHaveClass("psi-sr-only");
  });

  it("gives neutral no status word", () => {
    render(<Banner variant="neutral">msg</Banner>);
    expect(screen.queryByText(/^(Success|Warning|Error):$/)).toBeNull();
  });

  it("replaces the status word when statusLabel is a string (D83)", () => {
    render(<Banner variant="danger" statusLabel="Fehler:">msg</Banner>);
    expect(screen.getByText("Fehler:")).toBeInTheDocument();
    expect(screen.queryByText("Error:")).toBeNull();
  });

  it("drops the status word when statusLabel is null (D83)", () => {
    render(<Banner variant="danger" statusLabel={null}>msg</Banner>);
    expect(screen.queryByText("Error:")).toBeNull();
    expect(document.querySelector(".psi-sr-only")).toBeNull();
  });

  it("renders the action slot", () => {
    render(<Banner action={<button type="button">Review</button>}>msg</Banner>);
    expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument();
  });

  it("renders a dismiss button only when onDismiss is provided", () => {
    const { rerender } = render(<Banner>msg</Banner>);
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();

    rerender(<Banner onDismiss={() => {}}>msg</Banner>);
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("calls onDismiss exactly once per click and does not remove itself", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Banner onDismiss={onDismiss}>still here</Banner>);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByText("still here")).toBeInTheDocument();
  });

  it("hides the status icon from assistive tech", () => {
    const { container } = render(<Banner variant="danger">msg</Banner>);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("is not a live region: no role and no aria-live anywhere in the tree", () => {
    const { container } = render(
      <Banner
        variant="danger"
        title="Payment failed"
        action={<button type="button">Retry</button>}
        onDismiss={() => {}}
      >
        msg
      </Banner>,
    );
    expect(container.querySelector("[role]")).toBeNull();
    expect(container.querySelector("[aria-live]")).toBeNull();
  });

  it("merges className rather than replacing it", () => {
    const { container } = render(<Banner className="custom">msg</Banner>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("custom");
    expect(el.className.split(" ").length).toBeGreaterThan(1);
  });

  it("forwards its ref to the root div", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Banner ref={ref}>msg</Banner>);
    expect(ref.current).toBe(container.firstChild);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("spreads rest props onto the root", () => {
    render(<Banner data-testid="banner" id="b1">msg</Banner>);
    const el = screen.getByTestId("banner");
    expect(el).toHaveAttribute("id", "b1");
    expect(el).toHaveAttribute("data-psi-banner");
  });

  it("does not let rest props overwrite its own data attributes", () => {
    render(<Banner variant="success" data-variant="danger" data-testid="banner">msg</Banner>);
    expect(screen.getByTestId("banner")).toHaveAttribute("data-variant", "success");
  });
});
