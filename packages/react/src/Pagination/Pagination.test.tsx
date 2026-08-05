import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination, paginationRange } from "./Pagination.js";

describe("paginationRange", () => {
  it("lists every page when they all fit", () => {
    expect(paginationRange(1, 5, 1)).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles a single page", () => {
    expect(paginationRange(1, 1, 1)).toEqual([1]);
  });

  it("handles two pages", () => {
    expect(paginationRange(2, 2, 1)).toEqual([1, 2]);
  });

  it("truncates on the right near the start", () => {
    expect(paginationRange(2, 13, 1)).toEqual([1, 2, 3, "ellipsis", 13]);
  });

  it("truncates on both sides in the middle", () => {
    expect(paginationRange(7, 13, 1)).toEqual([1, "ellipsis", 6, 7, 8, "ellipsis", 13]);
  });

  it("truncates on the left near the end", () => {
    expect(paginationRange(13, 13, 1)).toEqual([1, "ellipsis", 11, 12, 13]);
  });

  it("widens with siblingCount", () => {
    expect(paginationRange(50, 100, 2)).toEqual([1, "ellipsis", 48, 49, 50, 51, 52, "ellipsis", 100]);
  });
});

describe("Pagination", () => {
  it("marks the current page with aria-current", () => {
    render(<Pagination page={4} pageCount={13} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "4" }).getAttribute("aria-current")).toBe("page");
  });

  it("gives no other page aria-current", () => {
    render(<Pagination page={4} pageCount={13} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "3" }).hasAttribute("aria-current")).toBe(false);
  });

  it("labels its nav landmark", () => {
    render(<Pagination page={1} pageCount={3} onPageChange={() => {}} />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeTruthy();
  });

  it("emits the clicked page", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={4} pageCount={13} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole("button", { name: "5" }));
    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it("disables previous on the first page", () => {
    render(<Pagination page={1} pageCount={13} onPageChange={() => {}} />);
    expect((screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables next on the last page", () => {
    render(<Pagination page={13} pageCount={13} onPageChange={() => {}} />);
    expect((screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders the ellipsis as non-interactive and unannounced", () => {
    const { container } = render(<Pagination page={7} pageCount={13} onPageChange={() => {}} />);
    const ellipses = container.querySelectorAll('[aria-hidden="true"]');
    expect(ellipses.length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "…" })).toBeNull();
  });
});
