import { Children, isValidElement, useMemo } from "react";
import type { ReactNode, Ref } from "react";
import styles from "./table.module.css";
import { EMPTY_SELECTION, TableContext, TableRowIdsContext } from "./TableContext.js";
import { TableBody } from "./TableBody.js";

export type TableSize = 32 | 40 | 48;

/** Controlled sort state. `null` means no column is sorted. */
export interface TableSortState {
  key: string;
  direction: "asc" | "desc";
}

/** Row ids in document order, read off the `TableBody` child's rows.
 * Computed here — not inside `TableBody` — because the select-all checkbox
 * lives in `TableHead`, `TableBody`'s sibling: a context provider mounted
 * inside `TableBody` only reaches `TableBody`'s own descendants, never a
 * sibling subtree. `Table` is the nearest common ancestor of both, so it is
 * the only place this can be computed and provided from (D62 review). */
function collectRowIds(children: ReactNode): string[] {
  const ids: string[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== TableBody) return;
    const bodyChildren = (child.props as { children?: ReactNode }).children;
    Children.forEach(bodyChildren, (row) => {
      if (!isValidElement(row)) return;
      const rowId = (row.props as { rowId?: string }).rowId;
      if (typeof rowId === "string") ids.push(rowId);
    });
  });
  return ids;
}

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
  const rowIds = useMemo(() => collectRowIds(children), [children]);
  return (
    <TableContext.Provider value={{ size, sortable, sort, onSortChange, selectable, selected, onSelectionChange }}>
      <TableRowIdsContext.Provider value={rowIds}>
        <table ref={ref} className={cls} data-size={size}>
          {children}
        </table>
      </TableRowIdsContext.Provider>
    </TableContext.Provider>
  );
}
