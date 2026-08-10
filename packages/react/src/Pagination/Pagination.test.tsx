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

  // Regression: the fixed-window bug in the two single-ellipsis branches
  // dropped a true sibling of the current page on ordinary inputs — one
  // click past the start was enough to trigger it.
  it("does not drop the right sibling one click past the start (regression)", () => {
    expect(paginationRange(3, 13, 1)).toEqual([1, 2, 3, 4, "ellipsis", 13]);
  });

  it("does not drop the left sibling one click before the end (regression)", () => {
    expect(paginationRange(11, 13, 1)).toEqual([1, "ellipsis", 10, 11, 12, 13]);
  });

  it("clamps a negative siblingCount instead of producing adjacent ellipses", () => {
    expect(paginationRange(7, 13, -1)).toEqual([1, "ellipsis", 7, "ellipsis", 13]);
  });

  describe("sibling invariant sweep", () => {
    // Sweeps pageCount 1-30 x siblingCount 1-3 x every page, and asserts the
    // contract paginationRange must hold for all valid inputs:
    //   1. every true sibling of `page` within pageCount bounds appears
    //   2. page 1 and pageCount always appear
    //   3. an ellipsis elides at least two pages (never stands in for one)
    //   4. output is strictly ascending, no duplicates, no adjacent ellipses
    // This is the test that would have caught the fixed-window bug: case 4
    // (2, 13, 1) already passed under the old code, but case 3 (3, 13, 1)
    // is what exposed the drop.
    for (let pageCount = 1; pageCount <= 30; pageCount++) {
      for (let siblingCount = 1; siblingCount <= 3; siblingCount++) {
        for (let page = 1; page <= pageCount; page++) {
          it(`holds for page=${page} pageCount=${pageCount} siblingCount=${siblingCount}`, () => {
            const out = paginationRange(page, pageCount, siblingCount);

            // Invariant 1: every true sibling is present.
            const wantLo = Math.max(page - siblingCount, 1);
            const wantHi = Math.min(page + siblingCount, pageCount);
            for (let p = wantLo; p <= wantHi; p++) {
              expect(out).toContain(p);
            }

            // Invariant 2: first and last page always present.
            expect(out).toContain(1);
            expect(out).toContain(pageCount);

            // Invariants 3 & 4: ellipsis elides >=2, strictly ascending,
            // no duplicates, no adjacent ellipses.
            let lastNum = -Infinity;
            for (let i = 0; i < out.length; i++) {
              const item = out[i];
              if (item === "ellipsis") {
                expect(out[i + 1]).not.toBe("ellipsis");
                const prev = out[i - 1];
                const next = out[i + 1];
                expect(typeof prev).toBe("number");
                expect(typeof next).toBe("number");
                const hidden = (next as number) - (prev as number) - 1;
                expect(hidden).toBeGreaterThanOrEqual(2);
              } else {
                expect(item).toBeGreaterThan(lastNum);
                lastNum = item;
              }
            }
          });
        }
      }
    }
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

describe("Pagination out-of-range page (D78)", () => {
  it("marks the last page current when page exceeds pageCount", () => {
    render(<Pagination page={5} pageCount={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-current", "page");
  });

  it("emits from the effective page, so Previous can recover from out of range", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={5} pageCount={3} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("marks the first page current when page is below 1", () => {
    render(<Pagination page={0} pageCount={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
  });

  it("renders no page buttons and disables both arrows when there are no pages", () => {
    render(<Pagination page={3} pageCount={0} onPageChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "1" })).toBeNull();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("warns in dev when page is out of range", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Pagination page={5} pageCount={3} onPageChange={vi.fn()} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("out of range"));
    warn.mockRestore();
  });

  it("warns when there are no pages at all", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Pagination page={3} pageCount={0} onPageChange={vi.fn()} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("out of range"));
    warn.mockRestore();
  });

  it("does not warn for an in-range page", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Pagination page={2} pageCount={3} onPageChange={vi.fn()} />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
