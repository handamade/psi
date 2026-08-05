import type { ReactNode, Ref } from "react";
import styles from "./table.module.css";
import { TableContext } from "./TableContext.js";

export type TableSize = 32 | 40 | 48;

/** Controlled sort state. `null` means no column is sorted. */
export interface TableSortState {
  key: string;
  direction: "asc" | "desc";
}

const EMPTY_SELECTION: ReadonlySet<string> = new Set<string>();

export interface TableProps {
  /** Row height in px. @default 40 */
  size?: TableSize;
  /** Pins the header while the body scrolls. */
  stickyHeader?: boolean;
  /** Enables the sort affordance on header cells that declare a `sortKey`. */
  sortable?: boolean;
  /** Controlled sort state; `null` when nothing is sorted. */
  sort?: TableSortState | null;
  /**
   * Called when a header's sort control is activated. Optional in the type
   * because `sortable` may be false; a discriminated union expressing the real
   * contract does not survive docgen's flat prop extraction, which would strip
   * these props from the manifest entirely (D62).
   */
  onSortChange?: (sort: TableSortState) => void;
  /** Renders the row-selection checkbox column. */
  selectable?: boolean;
  /** Controlled selection, keyed by each `TableRow`'s `rowId`. */
  selected?: ReadonlySet<string>;
  /** Called with the next selection. See `onSortChange` on why it is optional. */
  onSelectionChange?: (selected: ReadonlySet<string>) => void;
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the underlying `<table>` element. */
  ref?: Ref<HTMLTableElement>;
}

/** Data table on native table semantics. Holds no state: sorting, selection
 * and pagination are the consumer's (D62, extending D50/D53). */
export function Table({
  size = 40,
  stickyHeader,
  sortable = false,
  sort = null,
  onSortChange,
  selectable = false,
  selected = EMPTY_SELECTION,
  onSelectionChange,
  children,
  className,
  ref,
}: TableProps) {
  const cls = [styles.table, stickyHeader && styles.sticky, className].filter(Boolean).join(" ");
  if (process.env.NODE_ENV !== "production") {
    if (sortable && !onSortChange) console.warn("Psi Table: `sortable` is set without `onSortChange`; sorting will not respond.");
    if (selectable && !onSelectionChange) console.warn("Psi Table: `selectable` is set without `onSelectionChange`; selection will not respond.");
  }
  return (
    <TableContext.Provider value={{ size, sortable, sort, onSortChange, selectable, selected, onSelectionChange }}>
      <table ref={ref} className={cls} data-size={size}>
        {children}
      </table>
    </TableContext.Provider>
  );
}
