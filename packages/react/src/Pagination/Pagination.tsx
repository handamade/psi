import { useEffect, useRef } from "react";
import type { CSSProperties, MouseEvent } from "react";
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

type Form = "wide" | "compact";

/** One item of the rendered pager. `only` names the single form an item
 * belongs to; `undefined` means both. */
export type PagerItem =
  | { kind: "page"; page: number; only: Form | undefined }
  | { kind: "ellipsis"; before: number; only: Form | undefined };

/** The wide form (`siblingCount`) and the compact form (`siblingCount` 0)
 * as one list, so `Pagination` renders every button once and a media query
 * hides the other form's items (D127). Pure and exported for tests; not
 * part of the package's public API.
 *
 * The compact pages are a subset of the wide ones for every `siblingCount`
 * (the sweep test checks it), so the union adds only ellipses. Every ellipsis
 * in either form sits directly before a page, so each is emitted before the
 * page it precedes in its own form: one that both forms have before the same
 * page is shared. */
export function pagerItems(page: number, pageCount: number, siblingCount: number): PagerItem[] {
  const wide = paginationRange(page, pageCount, siblingCount);
  const compact = paginationRange(page, pageCount, 0);

  const pagesOf = (list: Array<number | "ellipsis">) =>
    new Set(list.filter((x): x is number => x !== "ellipsis"));
  const ellipsesBefore = (list: Array<number | "ellipsis">) =>
    new Set(list.flatMap((x, i) => (x === "ellipsis" ? [list[i + 1] as number] : [])));

  const widePages = pagesOf(wide);
  const compactPages = pagesOf(compact);
  const wideEllipses = ellipsesBefore(wide);
  const compactEllipses = ellipsesBefore(compact);
  const only = (inWide: boolean, inCompact: boolean): Form | undefined =>
    inWide && inCompact ? undefined : inWide ? "wide" : "compact";

  const items: PagerItem[] = [];
  const pages = [...new Set([...widePages, ...compactPages])].sort((a, b) => a - b);
  for (const n of pages) {
    const w = wideEllipses.has(n);
    const c = compactEllipses.has(n);
    if (w || c) items.push({ kind: "ellipsis", before: n, only: only(w, c) });
    items.push({ kind: "page", page: n, only: only(widePages.has(n), compactPages.has(n)) });
  }
  return items;
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
  /**
   * Pages shown either side of the current one before truncating. Once the
   * pages don't all fit, the pager shows `2 * siblingCount + 5` slots on every
   * page, so Previous and Next hold still (D127). At or below 560px of
   * viewport the pager uses 0, its compact form: `1 … 50 … 100`, five slots,
   * which fits a 320px screen up to 999 pages and a 375px one up to 9,999.
   * Pass 0 for the compact form at any width.
   * @default 1
   */
  siblingCount?: number;
  /**
   * Accessible name of the previous-page button, which shows only a chevron.
   * Translate it here; `CursorPagination`'s prop of the same name is its
   * visible text instead.
   * @default "Previous page"
   */
  previousLabel?: string;
  /** Accessible name of the next-page button, which shows only a chevron.
   * @default "Next page" */
  nextLabel?: string;
  /** Accessible name for the nav landmark. @default "Pagination" */
  "aria-label"?: string;
  className?: string;
}

/** Numbered pager with ellipsis truncation (D63). Its arrows hold still: a
 * fixed slot count of one width (D127). Below 560px of viewport it shows its
 * compact form. Standalone rather than a
 * Table family member: `table-pagination` composes it as a Toolbar sibling of
 * the page-size Select. */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  previousLabel = "Previous page",
  nextLabel = "Next page",
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

  // D127: an arrow that disables itself on the first or last page would take
  // keyboard focus with it — the browser leaves it on a disabled button that
  // draws no ring and answers no key, or drops it to the body. So when the
  // arrow that had focus is disabled by the page change, focus moves to the
  // current page's button, whose aria-current tells a screen reader where the
  // user landed. Only from the arrow that had focus (a pointer click in Safari
  // focuses nothing), and only while focus is still on it or on the body (a
  // user who has moved on, or a consumer that sent focus to a caption, is
  // left alone; the consumer's effect runs after this one).
  const navRef = useRef<HTMLElement>(null);
  const pressedArrow = useRef<HTMLElement | null>(null);
  const pressArrow = (event: MouseEvent<HTMLElement>, target: number) => {
    pressedArrow.current = event.currentTarget === document.activeElement ? event.currentTarget : null;
    onPageChange(target);
  };
  useEffect(() => {
    const arrow = pressedArrow.current;
    pressedArrow.current = null;
    if (!(arrow instanceof HTMLButtonElement) || !arrow.disabled) return;
    const active = document.activeElement;
    if (active !== arrow && active !== document.body && active !== null) return;
    navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
  }, [effectivePage, pageCount]);

  const items = hasPages ? pagerItems(effectivePage, pageCount, siblingCount) : [];
  // Every slot is as wide as the widest number (D127): with tabular numerals,
  // every number of this many digits has one width.
  const digits = hasPages ? String(Math.trunc(pageCount)).length : 1;
  const navStyle = { "--psi-pagination-digits": digits } as CSSProperties;
  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className={[styles.nav, className].filter(Boolean).join(" ")}
      style={navStyle}
    >
      <IconButton
        aria-label={previousLabel}
        size={32}
        variant="ghost"
        disabled={!hasPages || effectivePage <= 1}
        onClick={(event) => pressArrow(event, effectivePage - 1)}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
          <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </IconButton>

      {items.map((item) =>
        item.kind === "ellipsis" ? (
          <span
            key={`e${item.before}${item.only ?? ""}`}
            className={[styles.slot, styles.ellipsis].join(" ")}
            data-only={item.only}
            aria-hidden="true"
          >
            {"…"}
          </span>
        ) : (
          <Button
            key={item.page}
            size={32}
            variant={item.page === effectivePage ? "accent-subtle" : "ghost"}
            className={styles.slot}
            data-only={item.only}
            aria-current={item.page === effectivePage ? "page" : undefined}
            onClick={() => onPageChange(item.page)}
          >
            {String(item.page)}
          </Button>
        ),
      )}

      <IconButton
        aria-label={nextLabel}
        size={32}
        variant="ghost"
        disabled={!hasPages || effectivePage >= pageCount}
        onClick={(event) => pressArrow(event, effectivePage + 1)}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
          <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </IconButton>
    </nav>
  );
}
