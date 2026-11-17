import { useContext, useLayoutEffect } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./table.module.css";
import { TableContainerContext } from "./TableContext.js";

export interface TableCaptionProps extends Omit<HTMLAttributes<HTMLTableCaptionElement>, "children"> {
  /** The name line — what the table lists. Also the table's accessible name. */
  children: ReactNode;
  /** An optional second line: the range shown, say — "Rows 51–100 of more
   * than 100,000". */
  detail?: ReactNode;
  className?: string;
  /** Forwarded ref to the `<caption>`, so focus can be moved to it. */
  ref?: Ref<HTMLTableCaptionElement>;
}

/** `<caption>` — the table's name, above it, and an optional detail line
 * (D85). It names the table for assistive tech, which an `aria-label` on the
 * `Table` would also do, but a caption is visible.
 *
 * A token-paged list has no page numbers to land on, so after a page change
 * the consumer moves focus here: give it `tabIndex={-1}`, put the range in
 * `detail`, and call `focus()` on the ref. The ring is the shared one (D82),
 * drawn inside the caption's box. Remaining attributes land on the element.
 *
 * Inside a TableContainer it also names the scrolling region (D126). */
export function TableCaption({ children, detail, className, id, ref, ...rest }: TableCaptionProps) {
  const container = useContext(TableContainerContext);
  // An empty id names nothing: treat it as absent (D128), as the container
  // treats an empty aria-label.
  const finalId = id || container?.offeredId || undefined;

  useLayoutEffect(() => {
    if (!container) return;
    container.register(finalId);
    return () => container.register(undefined);
  }, [container, finalId]);

  return (
    <caption
      {...rest}
      id={finalId}
      ref={ref}
      className={[styles.caption, className].filter(Boolean).join(" ")}
    >
      {children}
      {detail != null && <span className={styles.captionDetail}>{detail}</span>}
    </caption>
  );
}
