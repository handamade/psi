import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Toast } from "./Toast.js";
import { ToastRegion } from "./ToastRegion.js";

// `hidden: true` compensates for a jsdom gap, and only that. jsdom ships the
// popover UA stylesheet (`[popover] { display: none }`) but not the JS API, so
// the vitest.setup.ts polyfill records showPopover() as `data-open` without
// ever clearing that display — which leaves the whole region subtree out of
// the accessibility tree here and nowhere else. In a real browser a shown
// manual popover is visible and both wrappers are exposed normally. Same class
// of jsdom limitation Menu documents; the browser-truth assertions live in
// apps/storybook/vr/toast.interaction.spec.ts.
const polite = () => screen.getByRole("status", { hidden: true });
const assertive = () => screen.getByRole("alert", { hidden: true });

describe("ToastRegion", () => {
  it("renders both live wrappers when it has no children at all", () => {
    // The whole point of D64: a live region announces *mutations* to a subtree
    // that already existed. If the wrappers mounted with their first toast,
    // screen readers would see a new subtree rather than a change, and the
    // first toast — often the only one — would go unannounced.
    render(<ToastRegion>{null}</ToastRegion>);

    expect(polite()).toBeInTheDocument();
    expect(polite()).toBeEmptyDOMElement();
    expect(assertive()).toBeInTheDocument();
    expect(assertive()).toBeEmptyDOMElement();
  });

  it("sets the matching aria-live politeness on each wrapper", () => {
    render(<ToastRegion>{null}</ToastRegion>);
    expect(polite()).toHaveAttribute("aria-live", "polite");
    expect(assertive()).toHaveAttribute("aria-live", "assertive");
  });

  it("enters the top layer on mount", () => {
    const { container } = render(<ToastRegion>{null}</ToastRegion>);
    // jsdom's polyfill (vitest.setup.ts) records showPopover() as data-open.
    expect(container.firstChild).toHaveAttribute("data-open");
  });

  it('uses popover="manual", never "auto"', () => {
    // "auto" light-dismisses, so the very click that triggered the action
    // being confirmed would close the region. Assert the literal.
    const { container } = render(<ToastRegion>{null}</ToastRegion>);
    expect(container.firstChild).toHaveAttribute("popover", "manual");
  });

  it.each([
    ["neutral", "polite"],
    ["success", "polite"],
  ] as const)("routes %s into the polite wrapper", (variant) => {
    render(
      <ToastRegion>
        <Toast variant={variant}>routed</Toast>
      </ToastRegion>,
    );
    expect(within(polite()).getByText("routed")).toBeInTheDocument();
    expect(assertive()).toBeEmptyDOMElement();
  });

  it.each([
    ["warning", "assertive"],
    ["danger", "assertive"],
  ] as const)("routes %s into the assertive wrapper", (variant) => {
    render(
      <ToastRegion>
        <Toast variant={variant}>routed</Toast>
      </ToastRegion>,
    );
    expect(within(assertive()).getByText("routed")).toBeInTheDocument();
    expect(polite()).toBeEmptyDOMElement();
  });

  it("sends children that are not Toast elements to the polite wrapper", () => {
    render(
      <ToastRegion>
        <div>bare child</div>
      </ToastRegion>,
    );
    expect(within(polite()).getByText("bare child")).toBeInTheDocument();
  });

  it("tolerates a mixed queue, splitting it by variant", () => {
    render(
      <ToastRegion>
        <Toast variant="success">saved</Toast>
        <Toast variant="danger">failed</Toast>
      </ToastRegion>,
    );
    expect(within(polite()).getByText("saved")).toBeInTheDocument();
    expect(within(assertive()).getByText("failed")).toBeInTheDocument();
  });

  it("names the region Notifications by default and allows an override", () => {
    const { container, rerender } = render(<ToastRegion>{null}</ToastRegion>);
    expect(container.firstChild).toHaveAttribute("aria-label", "Notifications");

    rerender(<ToastRegion aria-label="Alerts">{null}</ToastRegion>);
    expect(container.firstChild).toHaveAttribute("aria-label", "Alerts");
  });

  it("defaults placement to bottom-end and reflects an override", () => {
    const { container, rerender } = render(<ToastRegion>{null}</ToastRegion>);
    expect(container.firstChild).toHaveAttribute("data-placement", "bottom-end");

    rerender(<ToastRegion placement="top-start">{null}</ToastRegion>);
    expect(container.firstChild).toHaveAttribute("data-placement", "top-start");
  });

  it("stays click-through so its empty band never deadens the page", () => {
    // The region is a band in the top layer. Without pointer-events: none an
    // invisible strip of the page goes dead to the mouse — a silent failure.
    // CSS Modules don't apply real styles in jsdom, so assert the class
    // contract instead; the behavioural proof is the Playwright spec.
    const { container } = render(<ToastRegion>{null}</ToastRegion>);
    expect((container.firstChild as HTMLElement).className).toContain("region");
  });
});
