import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CursorPagination } from "./CursorPagination.js";

describe("CursorPagination (D85)", () => {
  it("renders a nav with two buttons carrying visible text", () => {
    render(<CursorPagination hasPrevious hasNext onPrevious={() => {}} onNext={() => {}} />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    const prev = screen.getByRole("button", { name: "Previous" });
    const next = screen.getByRole("button", { name: "Next" });
    expect(prev).toHaveTextContent("Previous");
    expect(next).toHaveTextContent("Next");
    for (const svg of document.querySelectorAll("svg")) expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelectorAll("svg")).toHaveLength(2);
  });

  it("takes translated labels and a nav label", () => {
    render(
      <CursorPagination
        hasPrevious
        hasNext
        onPrevious={() => {}}
        onNext={() => {}}
        previousLabel="Zurück"
        nextLabel="Weiter"
        aria-label="Seiten"
      />,
    );
    expect(screen.getByRole("navigation", { name: "Seiten" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zurück" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weiter" })).toBeInTheDocument();
  });

  it("disables only the direction that is unavailable", () => {
    render(<CursorPagination hasPrevious={false} hasNext onPrevious={() => {}} onNext={() => {}} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("calls onNext once per press, and never the other handler", async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(<CursorPagination hasPrevious hasNext onPrevious={onPrevious} onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("calls nothing from a disabled button", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<CursorPagination hasPrevious hasNext={false} onPrevious={() => {}} onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onNext).not.toHaveBeenCalled();
  });

  it("merges className onto the nav", () => {
    render(<CursorPagination hasPrevious hasNext onPrevious={() => {}} onNext={() => {}} className="mine" />);
    const nav = screen.getByRole("navigation");
    expect(nav.className.split(" ")).toContain("mine");
    expect(nav.className.split(" ").length).toBeGreaterThan(1);
  });
});
