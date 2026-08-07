import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DescriptionList } from "./DescriptionList.js";
import { DescriptionItem } from "./DescriptionItem.js";

describe("DescriptionList", () => {
  it("renders a definition list with term/value pairs", () => {
    const { container } = render(
      <DescriptionList>
        <DescriptionItem term="Date">2026-08-07</DescriptionItem>
        <DescriptionItem term="Payee">Acme Corp</DescriptionItem>
      </DescriptionList>,
    );

    const dl = container.querySelector("dl")!;
    expect(dl).toBeInTheDocument();

    const terms = [...dl.querySelectorAll("dt")].map((n) => n.textContent);
    const values = [...dl.querySelectorAll("dd")].map((n) => n.textContent);
    expect(terms).toEqual(["Date", "Payee"]);
    expect(values).toEqual(["2026-08-07", "Acme Corp"]);
  });

  it("pairs each dt with the dd that follows it", () => {
    const { container } = render(
      <DescriptionList>
        <DescriptionItem term="Amount">$42.00</DescriptionItem>
      </DescriptionList>,
    );
    // The <dt>/<dd> pair must be adjacent siblings — a wrapper element between
    // them breaks the native association assistive tech relies on.
    const dt = container.querySelector("dt")!;
    expect(dt.nextElementSibling?.tagName).toBe("DD");
  });

  it("defaults to the stacked layout", () => {
    const { container } = render(
      <DescriptionList>
        <DescriptionItem term="Date">2026-08-07</DescriptionItem>
      </DescriptionList>,
    );
    expect(container.querySelector("dl")).toHaveAttribute("data-layout", "stacked");
  });

  it("accepts the inline layout", () => {
    const { container } = render(
      <DescriptionList layout="inline">
        <DescriptionItem term="Date">2026-08-07</DescriptionItem>
      </DescriptionList>,
    );
    expect(container.querySelector("dl")).toHaveAttribute("data-layout", "inline");
  });

  it("reflects the gap as a data attribute", () => {
    const { container } = render(
      <DescriptionList gap={16}>
        <DescriptionItem term="Date">2026-08-07</DescriptionItem>
      </DescriptionList>,
    );
    expect(container.querySelector("dl")).toHaveAttribute("data-gap", "16");
  });

  it("passes native attributes through to the root", () => {
    const { container } = render(
      <DescriptionList aria-label="Transaction detail" id="detail">
        <DescriptionItem term="Date">2026-08-07</DescriptionItem>
      </DescriptionList>,
    );
    const dl = container.querySelector("dl")!;
    expect(dl).toHaveAttribute("aria-label", "Transaction detail");
    expect(dl).toHaveAttribute("id", "detail");
  });

  it("merges a consumer className rather than replacing its own", () => {
    const { container } = render(
      <DescriptionList className="mine">
        <DescriptionItem term="Date">2026-08-07</DescriptionItem>
      </DescriptionList>,
    );
    const dl = container.querySelector("dl")!;
    expect(dl.className).toContain("mine");
    expect(dl.className.split(" ").length).toBeGreaterThan(1);
  });

  it("renders rich nodes as terms and values", () => {
    render(
      <DescriptionList>
        <DescriptionItem term={<span>Status</span>}>
          <strong>Cleared</strong>
        </DescriptionItem>
      </DescriptionList>,
    );
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Cleared").tagName).toBe("STRONG");
  });
});
