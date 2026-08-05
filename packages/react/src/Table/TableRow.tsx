import type { ReactNode } from "react";
import styles from "./table.module.css";

export interface TableRowProps {
  /** Stable identity for selection. Required for selectable tables (D62). */
  rowId?: string;
  children: ReactNode;
  className?: string;
}

/** `<tr>` wrapper. `rowId` is the key the `selected` set holds. */
export function TableRow({ rowId, children, className }: TableRowProps) {
  return (
    <tr className={[styles.row, className].filter(Boolean).join(" ")} data-row-id={rowId}>
      {children}
    </tr>
  );
}
