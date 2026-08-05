import { useContext } from "react";
import type { ReactNode } from "react";
import styles from "./table.module.css";
import { TableContext } from "./TableContext.js";
import { TableRowSelectionCell } from "./TableSelectionCell.js";

export interface TableRowProps {
  /** Stable identity for selection. Required for selectable tables (D62). */
  rowId?: string;
  /** Accessible name for this row's selection checkbox. */
  selectLabel?: string;
  children: ReactNode;
  className?: string;
}

/** `<tr>`. `rowId` is the key the `selected` set holds. */
export function TableRow({ rowId, selectLabel, children, className }: TableRowProps) {
  const { selectable, selected } = useContext(TableContext);
  const isSelected = rowId !== undefined && selected.has(rowId);
  return (
    <tr
      className={[styles.row, className].filter(Boolean).join(" ")}
      data-row-id={rowId}
      data-selected={isSelected || undefined}
    >
      {selectable && rowId !== undefined && (
        <TableRowSelectionCell rowId={rowId} label={selectLabel ?? `Select row ${rowId}`} />
      )}
      {children}
    </tr>
  );
}
