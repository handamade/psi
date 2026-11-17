import { useContext } from "react";
import type { ReactNode, Ref, ThHTMLAttributes } from "react";
import styles from "./table.module.css";
import { TableContext } from "./TableContext.js";

export interface TableHeaderCellProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "children"> {
  /** Sort key this column emits. Enables the sort control when the table is `sortable`. */
  sortKey?: string;
  /** Right-aligns and renders tabular figures (D62). */
  numeric?: boolean;
  /** Header label. */
  children?: ReactNode;
  className?: string;
  /** Forwarded ref to the `<th>`. */
  ref?: Ref<HTMLTableCellElement>;
}

type Mark = "both" | "asc" | "desc";

/** The sort mark (D126): private inline SVGs in currentColor, one size in
 * every state, so the slot is always filled and a right-aligned label never
 * shifts when its column becomes sorted. Not exported: the icon set does not
 * change. Same stroke conventions as src/icons. */
function SortMark({ mark }: { mark: Mark }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {mark === "both" && (
        <>
          <polyline points="7 9 12 4 17 9" />
          <polyline points="7 15 12 20 17 15" />
        </>
      )}
      {mark === "asc" && (
        <>
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </>
      )}
      {mark === "desc" && (
        <>
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </>
      )}
    </svg>
  );
}

/** `<th scope="col">`. `aria-sort` belongs on the th, never on the inner
 * button — assistive tech reads the sort state from the column header. */
export function TableHeaderCell({ sortKey, numeric, children, className, ref, ...rest }: TableHeaderCellProps) {
  const { sortable, sort, onSortChange } = useContext(TableContext);
  const isSortable = sortable && sortKey !== undefined;
  const isActive = isSortable && sort?.key === sortKey;
  const mark: Mark = isActive ? (sort!.direction === "asc" ? "asc" : "desc") : "both";

  const ariaSort = !isSortable
    ? undefined
    : isActive
      ? sort!.direction === "asc"
        ? "ascending"
        : "descending"
      : "none";

  const activate = () => {
    if (!sortKey) return;
    const direction = isActive && sort!.direction === "asc" ? "desc" : "asc";
    onSortChange?.({ key: sortKey, direction });
  };

  return (
    <th
      {...rest}
      ref={ref}
      scope="col"
      className={[styles.headerCell, className].filter(Boolean).join(" ")}
      data-numeric={numeric || undefined}
      aria-sort={ariaSort}
    >
      {isSortable ? (
        <button type="button" className={styles.sortButton} onClick={activate}>
          {children}
          <span
            className={styles.sortIndicator}
            aria-hidden="true"
            data-mark={mark}
            data-active={isActive || undefined}
          >
            <SortMark mark={mark} />
          </span>
        </button>
      ) : (
        children
      )}
    </th>
  );
}
