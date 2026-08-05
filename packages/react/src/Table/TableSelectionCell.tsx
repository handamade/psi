import { useContext, useEffect, useRef } from "react";
import styles from "./table.module.css";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { TableContext, TableRowIdsContext } from "./TableContext.js";

/** Per-row selection checkbox. Internal — not exported from index.ts. */
export function TableRowSelectionCell({ rowId, label }: { rowId: string; label: string }) {
  const { selected, onSelectionChange } = useContext(TableContext);
  const toggle = () => {
    const next = new Set(selected);
    if (next.has(rowId)) next.delete(rowId);
    else next.add(rowId);
    onSelectionChange?.(next);
  };
  return (
    <td className={`${styles.cell} ${styles.selectCell}`}>
      <Checkbox aria-label={label} checked={selected.has(rowId)} onChange={toggle} />
    </td>
  );
}

/** Select-all header checkbox, indeterminate on a partial selection. */
export function TableSelectAllCell() {
  const { selected, onSelectionChange } = useContext(TableContext);
  const rowIds = useContext(TableRowIdsContext);
  const ref = useRef<HTMLInputElement>(null);

  const all = rowIds.length > 0 && rowIds.every((id) => selected.has(id));
  const some = rowIds.some((id) => selected.has(id));

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some && !all;
  }, [some, all]);

  // `selected` is the consumer's global set, but `rowIds` is only the
  // currently rendered (e.g. current page's) rows — act on the visible rows
  // with set algebra rather than replacing the whole set, or a paginated
  // table's select-all/unselect-all silently discards every selection made
  // on other pages (final review finding, D62).
  const toggle = () => {
    const next = new Set(selected);
    if (all) rowIds.forEach((id) => next.delete(id));
    else rowIds.forEach((id) => next.add(id));
    onSelectionChange?.(next);
  };

  return (
    <th scope="col" className={`${styles.headerCell} ${styles.selectCell}`}>
      <Checkbox ref={ref} aria-label="Select all rows" checked={all} onChange={toggle} />
    </th>
  );
}
