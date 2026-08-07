import type { ReactNode } from "react";
import styles from "./table.module.css";

export interface TableCellProps {
  /** Right-aligns and renders tabular figures (D62). */
  numeric?: boolean;
  /** Cell content. */
  children?: ReactNode;
  className?: string;
}

/** `<td>`. `numeric` means right-aligned *and* tabular — a column that aligns
 * but whose digits jitter between rows defeats the purpose. */
export function TableCell({ numeric, children, className }: TableCellProps) {
  return (
    <td className={[styles.cell, className].filter(Boolean).join(" ")} data-numeric={numeric || undefined}>
      {children}
    </td>
  );
}
