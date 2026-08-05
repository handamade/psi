import type { ReactNode } from "react";
import styles from "./table.module.css";

export interface TableHeaderCellProps {
  /** Sort key this column emits. Enables the sort control when the table is `sortable`. */
  sortKey?: string;
  /** Right-aligns and renders tabular figures (D62). */
  numeric?: boolean;
  children?: ReactNode;
  className?: string;
}

/** `<th scope="col">`. The sort control arrives in Task 5. */
export function TableHeaderCell({ numeric, children, className }: TableHeaderCellProps) {
  return (
    <th
      scope="col"
      className={[styles.headerCell, className].filter(Boolean).join(" ")}
      data-numeric={numeric || undefined}
    >
      {children}
    </th>
  );
}
