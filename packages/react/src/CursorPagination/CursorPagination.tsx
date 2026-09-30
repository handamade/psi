import styles from "./cursor-pagination.module.css";
import { Button } from "../Button/Button.js";
import { IconChevronLeft, IconChevronRight } from "../icons/index.js";

export interface CursorPaginationProps {
  /** Whether a previous page exists — the consumer knows, from its tokens. */
  hasPrevious: boolean;
  /** Whether a next page exists. */
  hasNext: boolean;
  /** Called when the user asks for the previous page. */
  onPrevious: () => void;
  /** Called when the user asks for the next page. */
  onNext: () => void;
  /** Visible text of the previous button. @default "Previous" */
  previousLabel?: string;
  /** Visible text of the next button. @default "Next" */
  nextLabel?: string;
  /** Button height in px. @default 32 */
  size?: 32 | 40;
  /** Accessible name for the nav landmark. @default "Pagination" */
  "aria-label"?: string;
  className?: string;
}

/** A pager for a list that pages by cursor (D85): a backend that returns a
 * `nextPageToken` and no page count. Two `ghost` Buttons with visible words in
 * a `<nav>`; the chevrons only reinforce them. A direction that is not
 * available is disabled. It holds no state and knows nothing about pages —
 * the consumer holds the tokens and answers `hasPrevious` / `hasNext`.
 *
 * A sibling of `Pagination`, not a mode of it: `Pagination`'s contract is a
 * page count and numbers, and this one has neither. */
export function CursorPagination({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  previousLabel = "Previous",
  nextLabel = "Next",
  size = 32,
  "aria-label": ariaLabel = "Pagination",
  className,
}: CursorPaginationProps) {
  return (
    <nav aria-label={ariaLabel} className={[styles.nav, className].filter(Boolean).join(" ")}>
      <Button variant="ghost" size={size} disabled={!hasPrevious} onClick={onPrevious}>
        <IconChevronLeft size={16} aria-hidden="true" />
        {previousLabel}
      </Button>
      <Button variant="ghost" size={size} disabled={!hasNext} onClick={onNext}>
        {nextLabel}
        <IconChevronRight size={16} aria-hidden="true" />
      </Button>
    </nav>
  );
}
