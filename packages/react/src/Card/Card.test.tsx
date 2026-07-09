import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card.js";

describe("Card", () => {
  it("renders children in the body", () => {
    render(<Card><p>Body copy</p></Card>);
    expect(screen.getByText("Body copy")).toBeInTheDocument();
  });
  it("renders the media slot", () => {
    render(<Card media={<img alt="cover" src="x.jpg" />}>text</Card>);
    expect(screen.getByAltText("cover")).toBeInTheDocument();
  });
  it("applies featured and hoverLift classes", () => {
    const { container } = render(<Card variant="featured" hoverLift>x</Card>);
    expect(container.firstElementChild!.className).toMatch(/featured/);
    expect(container.firstElementChild!.className).toMatch(/hoverLift/);
  });
});
