import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./table.module.css";
import { TableContainerContext } from "./TableContext.js";

export interface TableContainerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Caps the height, so the table scrolls inside and a `stickyHeader` stays
   * at the top. A number is px; a string is any CSS length (`"60vh"`). */
  maxBlockSize?: number | string;
  /** One `Table`. */
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

const NO_NAME_WARNING =
  "Psi TableContainer: no TableCaption inside and no aria-label or aria-labelledby; the scrolling region has no name.";

/** A scrolling region for a wide or long `Table` (D126): scrolls both ways,
 * keeps a `stickyHeader` at its top, and draws the table's frame and corner
 * itself. A tab stop (`role="region"`, `tabIndex={0}`) so the keyboard can
 * scroll it, named by the table's `TableCaption` unless you pass
 * `aria-label` or `aria-labelledby`. Remaining attributes land on the `<div>`. */
export function TableContainer({ maxBlockSize, children, className, style, ref, ...rest }: TableContainerProps) {
  const offeredCaptionId = useId();
  const node = useRef<HTMLDivElement | null>(null);
  const warned = useRef(false);
  const [captionId, setCaptionId] = useState<string | undefined>(undefined);
  const ownName = rest["aria-label"] !== undefined || rest["aria-labelledby"] !== undefined;

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      node.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = el;
    },
    [ref],
  );

  // Every commit: the caption can arrive with data, or change its id. Reading
  // the DOM (not a registration effect) keeps the dev warning free of a
  // first-render false alarm. setCaptionId bails out when nothing changed.
  useLayoutEffect(() => {
    const caption = node.current?.querySelector(":scope > table > caption");
    setCaptionId(caption?.id || undefined);
    if (process.env.NODE_ENV !== "production" && !ownName && !caption && !warned.current) {
      warned.current = true;
      console.warn(NO_NAME_WARNING);
    }
  });

  const sized: CSSProperties | undefined =
    maxBlockSize === undefined
      ? style
      : { ...style, maxBlockSize: typeof maxBlockSize === "number" ? `${maxBlockSize}px` : maxBlockSize };

  return (
    <TableContainerContext.Provider value={offeredCaptionId}>
      <div
        {...rest}
        ref={setRef}
        role="region"
        tabIndex={0}
        aria-labelledby={rest["aria-labelledby"] ?? (rest["aria-label"] !== undefined ? undefined : captionId)}
        className={[styles.container, className].filter(Boolean).join(" ")}
        style={sized}
      >
        {children}
      </div>
    </TableContainerContext.Provider>
  );
}
