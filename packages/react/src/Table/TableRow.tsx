import { useContext, useId, useMemo, useState } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./table.module.css";
import { TableContext, TableRowContext } from "./TableContext.js";
import { TableRowSelectionCell } from "./TableSelectionCell.js";

export interface TableRowProps extends Omit<HTMLAttributes<HTMLTableRowElement>, "children"> {
  /** Stable identity for selection. Required for selectable tables (D62). */
  rowId?: string;
  /** Accessible name for this row's selection checkbox; wins over the
   * default, `Table`'s `selectRowLabel` followed by the row header or the
   * row's position (D128). */
  selectLabel?: string;
  /** The row's cells. */
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the `<tr>`. */
  ref?: Ref<HTMLTableRowElement>;
}

/** `<tr>`. `rowId` is the key the `selected` set holds. */
export function TableRow({ rowId, selectLabel, children, className, ref, ...rest }: TableRowProps) {
  const { selectable, selected } = useContext(TableContext);
  const isSelected = rowId !== undefined && selected.has(rowId);
  // The row header registers its id here, so the row's checkbox can be
  // labelled by it (D128). Offered only in a selectable table, so no other
  // table's row headers gain ids.
  const offeredHeaderId = useId();
  const [headerId, setHeaderId] = useState<string | undefined>(undefined);
  const rowContext = useMemo(() => ({ offeredHeaderId, registerHeader: setHeaderId }), [offeredHeaderId]);
  const row = (
    <tr
      {...rest}
      ref={ref}
      className={[styles.row, className].filter(Boolean).join(" ")}
      data-row-id={rowId}
      data-selected={isSelected || undefined}
    >
      {selectable && rowId !== undefined && (
        <TableRowSelectionCell rowId={rowId} selectLabel={selectLabel} headerId={headerId} />
      )}
      {children}
    </tr>
  );
  return selectable ? <TableRowContext.Provider value={rowContext}>{row}</TableRowContext.Provider> : row;
}
