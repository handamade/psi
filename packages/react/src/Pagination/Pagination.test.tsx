import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination, paginationRange, pagerItems } from "./Pagination.js";
import type { PagerItem } from "./Pagination.js";

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

  it("fills the window near the start, so the slot count holds (D127)", () => {
    expect(paginationRange(2, 13, 1)).toEqual([1, 2, 3, 4, 5, "ellipsis", 13]);
  });

  it("truncates on both sides in the middle", () => {
    expect(paginationRange(7, 13, 1)).toEqual([1, "ellipsis", 6, 7, 8, "ellipsis", 13]);
  });

  it("fills the window near the end, so the slot count holds (D127)", () => {
    expect(paginationRange(13, 13, 1)).toEqual([1, "ellipsis", 9, 10, 11, 12, 13]);
  });

  it("widens with siblingCount", () => {
    expect(paginationRange(50, 100, 2)).toEqual([1, "ellipsis", 48, 49, 50, 51, 52, "ellipsis", 100]);
  });

  // Regression: the fixed-window bug in the two single-ellipsis branches
  // dropped a true sibling of the current page on ordinary inputs — one
  // click past the start was enough to trigger it.
  it("does not drop the right sibling one click past the start (regression)", () => {
    expect(paginationRange(3, 13, 1)).toEqual([1, 2, 3, 4, 5, "ellipsis", 13]);
  });

  it("does not drop the left sibling one click before the end (regression)", () => {
    expect(paginationRange(11, 13, 1)).toEqual([1, "ellipsis", 9, 10, 11, 12, 13]);
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
    //   5. the slot count is the same on every page (D127): every page when
    //      they fit, else 2 * siblingCount + 5 — so Previous and Next hold still
    // This is the test that would have caught the fixed-window bug: case 4
    // (2, 13, 1) already passed under the old code, but case 3 (3, 13, 1)
    // is what exposed the drop.
    for (let pageCount = 1; pageCount <= 30; pageCount++) {
      for (let siblingCount = 0; siblingCount <= 3; siblingCount++) {
        for (let page = 1; page <= pageCount; page++) {
          it(`holds for page=${page} pageCount=${pageCount} siblingCount=${siblingCount}`, () => {
            const out = paginationRange(page, pageCount, siblingCount);

            // Invariant 1: every true sibling is present.
            const wantLo = Math.max(page - siblingCount, 1);
            const wantHi = Math.min(page + siblingCount, pageCount);
            for (let p = wantLo; p <= wantHi; p++) {
              expect(out).toContain(p);
            }

            // Invariant 5: a constant slot count.
            expect(out).toHaveLength(Math.min(pageCount, 2 * siblingCount + 5));

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

  it("treats a non-finite page as 1, not NaN, so the clamp still lands", () => {
    render(<Pagination page={NaN} pageCount={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });
});

describe("pagerItems: the wide and compact forms in one list (D127)", () => {
  const form = (items: PagerItem[], which: "wide" | "compact") =>
    items
      .filter((it) => it.only === undefined || it.only === which)
      .map((it) => (it.kind === "page" ? it.page : "ellipsis"));

  it("marks the pages and ellipses that belong to one form", () => {
    expect(pagerItems(50, 100, 1)).toEqual([
      { kind: "page", page: 1, only: undefined },
      { kind: "ellipsis", before: 49, only: "wide" },
      { kind: "page", page: 49, only: "wide" },
      { kind: "ellipsis", before: 50, only: "compact" },
      { kind: "page", page: 50, only: undefined },
      { kind: "page", page: 51, only: "wide" },
      { kind: "ellipsis", before: 100, only: undefined },
      { kind: "page", page: 100, only: undefined },
    ]);
  });

  it("marks nothing when siblingCount is already 0", () => {
    expect(pagerItems(50, 100, 0).every((it) => it.only === undefined)).toBe(true);
  });

  describe("sweep", () => {
    for (let pageCount = 1; pageCount <= 30; pageCount++) {
      for (let siblingCount = 0; siblingCount <= 3; siblingCount++) {
        it(`reproduces both forms for pageCount=${pageCount} siblingCount=${siblingCount}`, () => {
          for (let page = 1; page <= pageCount; page++) {
            const items = pagerItems(page, pageCount, siblingCount);
            expect(form(items, "wide")).toEqual(paginationRange(page, pageCount, siblingCount));
            expect(form(items, "compact")).toEqual(paginationRange(page, pageCount, 0));
            // The compact numbers are a subset of the wide ones, so no page
            // button is compact-only and none is rendered twice.
            expect(items.some((it) => it.kind === "page" && it.only === "compact")).toBe(false);
          }
        });
      }
    }
  });
});

describe("Pagination forms, slots and names (D127)", () => {
  it("renders each page button once, marking the wide-only ones", () => {
    const { container } = render(<Pagination page={50} pageCount={100} onPageChange={() => {}} />);
    for (const n of ["1", "49", "50", "51", "100"]) {
      expect(screen.getAllByRole("button", { name: n })).toHaveLength(1);
    }
    expect(screen.getByRole("button", { name: "49" })).toHaveAttribute("data-only", "wide");
    expect(screen.getByRole("button", { name: "50" })).not.toHaveAttribute("data-only");
    expect(container.querySelectorAll('[aria-hidden="true"][data-only="compact"]')).toHaveLength(1);
  });

  it("marks nothing with siblingCount 0", () => {
    const { container } = render(
      <Pagination page={50} pageCount={100} siblingCount={0} onPageChange={() => {}} />,
    );
    expect(container.querySelector("[data-only]")).toBeNull();
  });

  it("sets the digit count of pageCount for the slot width", () => {
    render(<Pagination page={1} pageCount={100} onPageChange={() => {}} />);
    const nav = screen.getByRole("navigation");
    expect(nav.style.getPropertyValue("--psi-pagination-digits")).toBe("3");
  });

  it("names the arrows Previous page and Next page by default", () => {
    render(<Pagination page={2} pageCount={3} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next page" })).toBeTruthy();
  });

  it("takes translated arrow names", () => {
    render(
      <Pagination page={2} pageCount={3} previousLabel="Vorherige Seite" nextLabel="Nächste Seite" onPageChange={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Vorherige Seite" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nächste Seite" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
  });
});

describe("Pagination keeps focus when an arrow disables itself (D127)", () => {
  function Controlled({ start, count }: { start: number; count: number }) {
    const [page, setPage] = useState(start);
    return <Pagination page={page} pageCount={count} onPageChange={setPage} />;
  }

  it("moves focus to the last page's button when Next reaches it", async () => {
    const user = userEvent.setup();
    render(<Controlled start={12} count={13} />);
    screen.getByRole("button", { name: "Next page" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "13" })).toHaveFocus();
  });

  it("moves focus to the first page's button when Previous reaches it", async () => {
    const user = userEvent.setup();
    render(<Controlled start={2} count={13} />);
    screen.getByRole("button", { name: "Previous page" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "1" })).toHaveFocus();
  });

  it("leaves focus on Next while it stays enabled", async () => {
    const user = userEvent.setup();
    render(<Controlled start={5} count={13} />);
    const next = screen.getByRole("button", { name: "Next page" });
    next.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "6" })).toHaveAttribute("aria-current", "page");
    expect(next).toHaveFocus();
  });

  it("moves no focus for a click on an arrow that did not have it", () => {
    render(<Controlled start={12} count={13} />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByRole("button", { name: "13" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "13" })).not.toHaveFocus();
  });
});
