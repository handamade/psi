import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AspectRatio } from "./AspectRatio.js";

describe("AspectRatio", () => {
  it("applies the ratio as inline style", () => {
    const { container } = render(<AspectRatio ratio={16 / 10}><img alt="shot" src="x.jpg" /></AspectRatio>);
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe(String(16 / 10));
  });
  it("renders the child", () => {
    render(<AspectRatio ratio={4 / 5}><img alt="portrait" src="y.jpg" /></AspectRatio>);
    expect(screen.getByAltText("portrait")).toBeInTheDocument();
  });
});
