import styles from "./pagination.module.css";
import { Button } from "../Button/Button.js";
import { IconButton } from "../IconButton/IconButton.js";

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Pages to render, with "ellipsis" marking an elided run. Pure and exported
 * so the truncation math is testable without rendering.
 *
 * Note: an earlier version of this used a single symmetric window
 * (`[page - siblingCount, page + siblingCount]`, clamped at the edges) and
 * did not compensate when clamping shrank the window near the last page —
 * `paginationRange(13, 13, 1)` came out as `[1, "ellipsis", 12, 13]` instead
 * of `[1, "ellipsis", 11, 12, 13]`. This version widens the surviving side
 * to a full `2 * siblingCount + 1` run whenever only one ellipsis is shown,
 * matching the symmetric case that already worked near the first page. */
export function paginationRange(
  page: number,
  pageCount: number,
  siblingCount: number,
): Array<number | "ellipsis"> {
  // first + last + current + 2 siblings + 2 ellipses
  const maxSlots = siblingCount * 2 + 5;
  if (pageCount <= maxSlots) {
    return range(1, pageCount);
  }

  const leftSibling = Math.max(page - siblingCount, 1);
  const rightSibling = Math.min(page + siblingCount, pageCount);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < pageCount - 1;
  const windowSize = siblingCount * 2 + 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [...range(1, windowSize), "ellipsis", pageCount];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    return [1, "ellipsis", ...range(pageCount - windowSize + 1, pageCount)];
  }

  if (showLeftEllipsis && showRightEllipsis) {
    return [1, "ellipsis", ...range(leftSibling, rightSibling), "ellipsis", pageCount];
  }

  // Neither ellipsis needed (shouldn't occur once pageCount > maxSlots, but
  // fall back to the full list rather than dropping pages).
  return range(1, pageCount);
}

export interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  /** Called with the requested page. Optional for the same docgen reason as Table's handlers (D62). */
  onPageChange?: (page: number) => void;
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
  const items = paginationRange(page, pageCount, siblingCount);
  return (
    <nav aria-label={ariaLabel} className={[styles.nav, className].filter(Boolean).join(" ")}>
      <IconButton
        aria-label="Previous page"
        size={32}
        variant="ghost"
        disabled={page <= 1}
        onClick={() => onPageChange?.(page - 1)}
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
            variant={item === page ? "accent-subtle" : "ghost"}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPageChange?.(item)}
          >
            {String(item)}
          </Button>
        ),
      )}

      <IconButton
        aria-label="Next page"
        size={32}
        variant="ghost"
        disabled={page >= pageCount}
        onClick={() => onPageChange?.(page + 1)}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
          <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </IconButton>
    </nav>
  );
}
