import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
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
export function TableContainer({
  maxBlockSize,
  children,
  className,
  style,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...rest
}: TableContainerProps) {
  const offeredId = useId();
  const node = useRef<HTMLDivElement | null>(null);
  const [captionId, setCaptionId] = useState<string | undefined>(undefined);
  const [headSize, setHeadSize] = useState<number | undefined>(undefined);
  const warned = useRef(false);
  // An empty string names nothing: treat it as absent.
  const ownLabel = ariaLabel || undefined;
  const ownLabelledBy = ariaLabelledBy || undefined;
  const ownName = ownLabel !== undefined || ownLabelledBy !== undefined;

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      node.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = el;
    },
    [ref],
  );

  // The caption registers its id (and withdraws it on unmount), so a caption
  // that arrives with data, changes its id or goes away is followed without
  // this component re-rendering first. Stable, so captions don't re-run.
  const context = useMemo(() => ({ offeredId, register: setCaptionId, setHeadSize }), [offeredId]);

  // Dev warning, once after mount. The DOM is read here (not the registered
  // id) so it stays free of a first-render false alarm. The ref keeps it to
  // one under StrictMode, which runs mount effects twice but keeps refs (D128).
  useLayoutEffect(() => {
    if (process.env.NODE_ENV === "production" || ownName || warned.current) return;
    warned.current = true;
    if (!node.current?.querySelector(":scope > table > caption")) console.warn(NO_NAME_WARNING);
  }, []);

  // A sticky header's measured size, as a private custom property the
  // stylesheet turns into scroll-padding-block-start (D128), so a focused row
  // scrolls clear of the header instead of under it.
  const sized = {
    ...(headSize === undefined ? undefined : { "--_psi-table-head-size": `${headSize}px` }),
    ...style,
    ...(maxBlockSize === undefined
      ? undefined
      : { maxBlockSize: typeof maxBlockSize === "number" ? `${maxBlockSize}px` : maxBlockSize }),
  } as CSSProperties;

  return (
    <TableContainerContext.Provider value={context}>
      <div
        {...rest}
        ref={setRef}
        role="region"
        tabIndex={0}
        aria-label={ownLabel}
        aria-labelledby={ownLabelledBy ?? (ownLabel !== undefined ? undefined : captionId || undefined)}
        className={[styles.container, className].filter(Boolean).join(" ")}
        style={sized}
      >
        {children}
      </div>
    </TableContainerContext.Provider>
  );
}
