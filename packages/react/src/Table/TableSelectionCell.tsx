import { useContext, useId } from "react";
import styles from "./table.module.css";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { TableContext, TableRowIdsContext } from "./TableContext.js";

/** Per-row selection checkbox. Internal — not exported from index.ts.
 * Its name, most specific first (D128): the row's `selectLabel`; then
 * `selectRowLabel` followed by the row header, by `aria-labelledby` naming the
 * checkbox itself and that cell, so it follows the cell's content; then
 * `selectRowLabel` followed by the row's 1-based position among the rows
 * Table reads. Never the raw rowId. */
export function TableRowSelectionCell({
  rowId,
  selectLabel,
  headerId,
}: {
  rowId: string;
  selectLabel?: string;
  headerId?: string;
}) {
  const { selected, onSelectionChange, selectRowLabel } = useContext(TableContext);
  const rowIds = useContext(TableRowIdsContext);
  const ownId = useId();
  const position = rowIds.indexOf(rowId) + 1;
  const byHeader = selectLabel === undefined && headerId !== undefined;
  const label =
    selectLabel ?? (byHeader || position === 0 ? selectRowLabel : `${selectRowLabel} ${position}`);
  const toggle = () => {
    const next = new Set(selected);
    if (next.has(rowId)) next.delete(rowId);
    else next.add(rowId);
    onSelectionChange?.(next);
  };
  return (
    <td className={`${styles.cell} ${styles.selectCell}`}>
      <Checkbox
        id={ownId}
        aria-label={label}
        aria-labelledby={byHeader ? `${ownId} ${headerId}` : undefined}
        checked={selected.has(rowId)}
        onChange={toggle}
      />
    </td>
  );
}

/** Select-all header checkbox, indeterminate on a partial selection. */
export function TableSelectAllCell() {
  const { selected, onSelectionChange, selectAllLabel } = useContext(TableContext);
  const rowIds = useContext(TableRowIdsContext);
  const all = rowIds.length > 0 && rowIds.every((id) => selected.has(id));
  const some = rowIds.some((id) => selected.has(id));

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
      <Checkbox aria-label={selectAllLabel} checked={all} indeterminate={some && !all} onChange={toggle} />
    </th>
  );
}
