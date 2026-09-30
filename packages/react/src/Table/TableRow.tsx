import { useContext } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./table.module.css";
import { TableContext } from "./TableContext.js";
import { TableRowSelectionCell } from "./TableSelectionCell.js";

export interface TableRowProps extends Omit<HTMLAttributes<HTMLTableRowElement>, "children"> {
  /** Stable identity for selection. Required for selectable tables (D62). */
  rowId?: string;
  /** Accessible name for this row's selection checkbox. */
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
  return (
    <tr
      {...rest}
      ref={ref}
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
