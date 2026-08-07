import { useContext } from "react";
import type { ReactNode } from "react";
import styles from "./table.module.css";
import { TableContext } from "./TableContext.js";

export interface TableHeaderCellProps {
  /** Sort key this column emits. Enables the sort control when the table is `sortable`. */
  sortKey?: string;
  /** Right-aligns and renders tabular figures (D62). */
  numeric?: boolean;
  /** Header label. */
  children?: ReactNode;
  className?: string;
}

/** `<th scope="col">`. `aria-sort` belongs on the th, never on the inner
 * button — assistive tech reads the sort state from the column header. */
export function TableHeaderCell({ sortKey, numeric, children, className }: TableHeaderCellProps) {
  const { sortable, sort, onSortChange } = useContext(TableContext);
  const isSortable = sortable && sortKey !== undefined;
  const isActive = isSortable && sort?.key === sortKey;

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
      scope="col"
      className={[styles.headerCell, className].filter(Boolean).join(" ")}
      data-numeric={numeric || undefined}
      aria-sort={ariaSort}
    >
      {isSortable ? (
        <button type="button" className={styles.sortButton} onClick={activate}>
          {children}
          <span className={styles.sortIndicator} aria-hidden="true">
            {isActive ? (sort!.direction === "asc" ? "↑" : "↓") : ""}
          </span>
        </button>
      ) : (
        children
      )}
    </th>
  );
}
