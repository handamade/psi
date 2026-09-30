import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Announcement } from "./Announcement.js";

describe("Announcement (D83)", () => {
  it("renders its text, visually hidden", () => {
    render(<Announcement>Row 12 updated</Announcement>);
    expect(screen.getByText("Row 12 updated").className).toBe("psi-sr-only");
  });

  it("is not a live region, and carries no role and no icon", () => {
    const { container } = render(<Announcement politeness="assertive">Accepted</Announcement>);
    const el = container.firstChild as HTMLElement;
    expect(el).not.toHaveAttribute("role");
    expect(el).not.toHaveAttribute("aria-live");
    expect(el).not.toHaveAttribute("politeness");
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelectorAll("[aria-live], [role]")).toHaveLength(0);
  });
});
