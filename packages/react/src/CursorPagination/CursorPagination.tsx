import { useEffect, useRef } from "react";
import type { MouseEvent } from "react";
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
 * available is disabled; if it had focus, focus moves to the other direction
 * (D127). It holds no state and knows nothing about pages —
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
  // D127: a button that disables itself (Next on the last page) would take
  // keyboard focus with it. When the button that had focus is disabled by the
  // change, focus moves to the other direction, if that one is enabled; with
  // both disabled it is left alone. As in Pagination, only from the button
  // that had focus, and only while focus is still on it or on the body — a
  // consumer that sends focus to the caption (the cursor-pagination preset)
  // runs its effect after this one and wins.
  const previousRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const nextRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const pressed = useRef<"previous" | "next" | null>(null);
  const press = (event: MouseEvent<HTMLElement>, which: "previous" | "next", handler: () => void) => {
    pressed.current = event.currentTarget === document.activeElement ? which : null;
    handler();
  };
  useEffect(() => {
    const which = pressed.current;
    pressed.current = null;
    if (!which) return;
    const [from, to] = which === "previous" ? [previousRef.current, nextRef.current] : [nextRef.current, previousRef.current];
    if (!(from instanceof HTMLButtonElement) || !from.disabled) return;
    if (!(to instanceof HTMLButtonElement) || to.disabled) return;
    const active = document.activeElement;
    if (active !== from && active !== document.body && active !== null) return;
    to.focus();
  }, [hasPrevious, hasNext]);

  return (
    <nav aria-label={ariaLabel} className={[styles.nav, className].filter(Boolean).join(" ")}>
      <Button
        ref={previousRef}
        variant="ghost"
        size={size}
        disabled={!hasPrevious}
        onClick={(event) => press(event, "previous", onPrevious)}
      >
        <IconChevronLeft size={16} aria-hidden="true" />
        <span>{previousLabel}</span>
      </Button>
      {/* The label is an element, not a text node, so Button's trailing-icon
          inset (`svg:last-child:not(:first-child)`) can tell this chevron from
          a leading one. */}
      <Button
        ref={nextRef}
        variant="ghost"
        size={size}
        disabled={!hasNext}
        onClick={(event) => press(event, "next", onNext)}
      >
        <span>{nextLabel}</span>
        <IconChevronRight size={16} aria-hidden="true" />
      </Button>
    </nav>
  );
}
