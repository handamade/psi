import styles from "./pagination.module.css";
import { Button } from "../Button/Button.js";
import { IconButton } from "../IconButton/IconButton.js";

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Pages to render, with "ellipsis" marking an elided run. Pure and exported
 * so the truncation math is testable without rendering.
 *
 * D127: the count of items is the same on every page, so Previous and Next
 * hold still under the pointer. When every page fits in
 * `2 * siblingCount + 5` slots, every page is shown. Otherwise the list is
 * always that many items — first, an ellipsis, the current page with
 * `siblingCount` pages either side, an ellipsis, last — and near an end the
 * window is filled out on the side away from that end, as it is in the
 * middle (`1 2 3 4 5 … 100` on pages 1–4, not `1 2 3 … 100`). Before D127
 * the window was padded only to `2 * siblingCount + 1`, so a 100-page pager
 * showed 5, 6 or 7 slots and Next moved by up to 37px between pages.
 *
 * An ellipsis always elides at least two pages — a single hidden page is
 * rendered directly instead, since an ellipsis standing in for one number is
 * worse than the number. Every true sibling of the current page is present
 * (an earlier fixed-window version dropped one; the sweep test guards it). */
export function paginationRange(
  page: number,
  pageCount: number,
  siblingCount: number,
): Array<number | "ellipsis"> {
  const siblings = Math.max(0, siblingCount);
  const windowSize = siblings * 2 + 1;
  // first + last + current window + 2 ellipses
  const slots = windowSize + 4;
  if (pageCount <= slots) {
    return range(1, pageCount);
  }

  // Near an end the run that touches it replaces the window and the ellipsis
  // on that side: the window plus the two slots they took.
  const edgeRun = windowSize + 2;
  // A left ellipsis would hide 2…page-siblings-1, fewer than two pages.
  if (page - siblings <= 3) {
    return [...range(1, edgeRun), "ellipsis", pageCount];
  }
  if (page + siblings >= pageCount - 2) {
    return [1, "ellipsis", ...range(pageCount - edgeRun + 1, pageCount)];
  }
  return [1, "ellipsis", ...range(page - siblings, page + siblings), "ellipsis", pageCount];
}

export interface PaginationProps {
  /**
   * Current page, 1-based. A value outside `[1, pageCount]` (including
   * non-finite values like `NaN`) is clamped for rendering and logs a
   * `console.warn` in development. `pageCount < 1` renders no page buttons.
   */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  /**
   * Called with the requested page. Required — unlike Table's `onSortChange`/
   * `onSelectionChange`, which are optional because `sortable`/`selectable`
   * gate whether they're meaningful, `Pagination` has no such gating boolean:
   * the prop is unconditionally meaningful, so a `Pagination` without it is a
   * dead control (final review finding, D62).
   */
  onPageChange: (page: number) => void;
  /** Pages shown either side of the current one before truncating. @default 1 */
  siblingCount?: number;
  /** Accessible name for the nav landmark. @default "Pagination" */
  "aria-label"?: string;
  className?: string;
}

/** Numbered pager with ellipsis truncation (D63). Standalone rather than a
 * Table family member: `table-pagination` composes it as a Toolbar sibling of
 * the page-size Select. */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  "aria-label": ariaLabel = "Pagination",
  className,
}: PaginationProps) {
  // D78: a controlled component that renders a page its `page` prop does not
  // name — a bounded exception to controlled-only, on the D65 precedent. An
  // out-of-range `page` otherwise matches no button, so `aria-current="page"`
  // lands nowhere and assistive tech reports a pager with no current page.
  const hasPages = pageCount >= 1;
  const safePage = Number.isFinite(page) ? page : 1;
  const effectivePage = hasPages ? Math.min(Math.max(safePage, 1), pageCount) : 0;

  if (process.env.NODE_ENV !== "production" && (!hasPages || page !== effectivePage)) {
    console.warn(
      `Psi Pagination: \`page\` ${page} is out of range for \`pageCount\` ${pageCount}; rendering page ${hasPages ? effectivePage : "none"}. Clamp \`page\` when \`pageCount\` shrinks — e.g. after filtering.`,
    );
  }

  const items = hasPages ? paginationRange(effectivePage, pageCount, siblingCount) : [];
  return (
    <nav aria-label={ariaLabel} className={[styles.nav, className].filter(Boolean).join(" ")}>
      <IconButton
        aria-label="Previous page"
        size={32}
        variant="ghost"
        disabled={!hasPages || effectivePage <= 1}
        onClick={() => onPageChange(effectivePage - 1)}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
          <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </IconButton>

      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span key={`e${i}`} className={styles.ellipsis} aria-hidden="true">
            {"…"}
          </span>
        ) : (
          <Button
            key={item}
            size={32}
            variant={item === effectivePage ? "accent-subtle" : "ghost"}
            aria-current={item === effectivePage ? "page" : undefined}
            onClick={() => onPageChange(item)}
          >
            {String(item)}
          </Button>
        ),
      )}

      <IconButton
        aria-label="Next page"
        size={32}
        variant="ghost"
        disabled={!hasPages || effectivePage >= pageCount}
        onClick={() => onPageChange(effectivePage + 1)}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
          <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </IconButton>
    </nav>
  );
}
