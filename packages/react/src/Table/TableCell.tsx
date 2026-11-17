import { useContext, useLayoutEffect } from "react";
import type { ReactNode, Ref, TdHTMLAttributes } from "react";
import styles from "./table.module.css";
import { TableRowContext } from "./TableContext.js";

export interface TableCellProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, "children"> {
  /** Right-aligns and renders tabular figures (D62). */
  numeric?: boolean;
  /** Columns the cell spans — an empty-state row spanning the table (D85). */
  colSpan?: number;
  /** Renders `<th scope="row">` instead of `<td>`: the cell that names its
   * row, an identifier say, so a screen reader reads it with every cell in
   * the row (D85). Styled as a cell, at medium weight. */
  rowHeader?: boolean;
  /** Cell content. */
  children?: ReactNode;
  className?: string;
  /** Forwarded ref to the cell element. */
  ref?: Ref<HTMLTableCellElement>;
}

/** `<td>`, or `<th scope="row">` with `rowHeader`. `numeric` means
 * right-aligned *and* tabular — a column that aligns but whose digits jitter
 * between rows defeats the purpose. Remaining attributes land on the cell
 * (D85). */
export function TableCell({ numeric, colSpan, rowHeader, children, className, id, ref, ...rest }: TableCellProps) {
  // A row header in a selectable table registers its id with its row, so the
  // row's checkbox is labelled by it (D128). An empty id names nothing.
  const row = useContext(TableRowContext);
  const headerId = rowHeader ? id || row?.offeredHeaderId || undefined : id;
  const register = rowHeader ? row?.registerHeader : undefined;
  useLayoutEffect(() => {
    if (!register) return;
    register(headerId);
    return () => register(undefined);
  }, [register, headerId]);

  const cls = [styles.cell, rowHeader && styles.rowHeader, className].filter(Boolean).join(" ");
  if (rowHeader) {
    return (
      <th {...rest} id={headerId} ref={ref} scope="row" colSpan={colSpan} className={cls} data-numeric={numeric || undefined}>
        {children}
      </th>
    );
  }
  return (
    <td {...rest} id={id} ref={ref} colSpan={colSpan} className={cls} data-numeric={numeric || undefined}>
      {children}
    </td>
  );
}
