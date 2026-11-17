import { createContext } from "react";
import type { TableSize, TableSortState } from "./Table.js";

/** Shared empty-selection sentinel — the one place an unselected `selected`
 * set is constructed, so `Table`'s default prop and this context's default
 * value can't drift into two different empty sets (D62 review). */
export const EMPTY_SELECTION: ReadonlySet<string> = new Set<string>();

export interface TableContextValue {
  size: TableSize;
  sortable: boolean;
  sort: TableSortState | null;
  onSortChange?: (sort: TableSortState) => void;
  selectable: boolean;
  selected: ReadonlySet<string>;
  onSelectionChange?: (selected: ReadonlySet<string>) => void;
}

export const TableContext = createContext<TableContextValue>({
  size: 40,
  sortable: false,
  sort: null,
  selectable: false,
  selected: EMPTY_SELECTION,
});

/** Row ids in document order, published by Table so the select-all
 * checkbox can compute all/some without the consumer restating them. */
export const TableRowIdsContext = createContext<string[]>([]);

/** The id a TableContainer offers its table's caption (D126). A caption with
 * no id of its own takes it, so the container can name itself with
 * aria-labelledby. undefined outside a container: a bare table's caption
 * gets no id. */
export const TableContainerContext = createContext<string | undefined>(undefined);
