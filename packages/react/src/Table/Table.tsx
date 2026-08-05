import type { ReactNode, Ref } from "react";
import styles from "./table.module.css";

export type TableSize = 32 | 40 | 48;

/** Controlled sort state. `null` means no column is sorted. */
export interface TableSortState {
  key: string;
  direction: "asc" | "desc";
}

export interface TableProps {
  /** Row height in px. @default 40 */
  size?: TableSize;
  /** Pins the header while the body scrolls. */
  stickyHeader?: boolean;
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the underlying `<table>` element. */
  ref?: Ref<HTMLTableElement>;
}

/** Data table on native table semantics. Holds no state: sorting, selection
 * and pagination are the consumer's (D62, extending D50/D53). */
export function Table({ size = 40, stickyHeader, children, className, ref }: TableProps) {
  const cls = [styles.table, stickyHeader && styles.sticky, className].filter(Boolean).join(" ");
  return (
    <table ref={ref} className={cls} data-size={size}>
      {children}
    </table>
  );
}
