import styles from "./pagination.module.css";
import { Button } from "../Button/Button.js";
import { IconButton } from "../IconButton/IconButton.js";

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Pages to render, with "ellipsis" marking an elided run. Pure and exported
 * so the truncation math is testable without rendering.
 *
 * Anchored on the real `leftSibling`/`rightSibling` for the current page —
 * not a page-count-independent fixed span. An earlier version's two
 * single-ellipsis branches used a fixed window (`range(1, windowSize)` /
 * `range(pageCount - windowSize + 1, pageCount)`) that didn't move with
 * `page` at all, so `paginationRange(3, 13, 1)` came out as
 * `[1, 2, 3, "ellipsis", 13]`, silently dropping true sibling page 4.
 *
 * Each single-ellipsis branch instead widens only as far as `max(sibling,
 * windowSize)` / `min(sibling, pageCount - windowSize + 1)` — enough to
 * always include the real sibling, while still padding out to a full
 * `2 * siblingCount + 1` run when clamping at an edge would otherwise
 * shrink it (e.g. `paginationRange(13, 13, 1)` needs `11, 12, 13`, not
 * just `12, 13`).
 *
 * An ellipsis is only rendered where it elides at least two pages — a
 * single hidden page is rendered directly instead, since an ellipsis
 * standing in for one number is worse than the number. */
export function paginationRange(
  page: number,
  pageCount: number,
  siblingCount: number,
): Array<number | "ellipsis"> {
  const siblings = Math.max(0, siblingCount);
  const windowSize = siblings * 2 + 1;

  // first + last + current window + 2 ellipses
  const maxSlots = windowSize + 4;
  if (pageCount <= maxSlots) {
    return range(1, pageCount);
  }

  const leftSibling = Math.max(page - siblings, 1);
  const rightSibling = Math.min(page + siblings, pageCount);
  // leftSibling > 3 / rightSibling < pageCount - 2 means at least two pages
  // would be hidden on that side — the minimum that justifies an ellipsis.
  const showLeftEllipsis = leftSibling > 3;
  const showRightEllipsis = rightSibling < pageCount - 2;

  if (!showLeftEllipsis && showRightEllipsis) {
    const end = Math.max(rightSibling, windowSize);
    return [...range(1, end), "ellipsis", pageCount];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const start = Math.min(leftSibling, pageCount - windowSize + 1);
    return [1, "ellipsis", ...range(start, pageCount)];
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
  const effectivePage = hasPages ? Math.min(Math.max(page, 1), pageCount) : 0;

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
