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
    <td className={styles.selectCell}>
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

  const toggle = () => onSelectionChange?.(all ? new Set<string>() : new Set(rowIds));

  return (
    <th scope="col" className={styles.selectCell}>
      <Checkbox ref={ref} aria-label="Select all rows" checked={all} onChange={toggle} />
    </th>
  );
}
