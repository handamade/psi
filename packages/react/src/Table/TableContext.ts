import { createContext } from "react";
import type { TableSize, TableSortState } from "./Table.js";

/** Shared empty-selection sentinel — the one place an unselected `selected`
 * set is constructed, so `Table`'s default prop and this context's default
 * value can't drift into two different empty sets (D62 review). */
export const EMPTY_SELECTION: ReadonlySet<string> = new Set<string>();

export interface TableContextValue {
  size: TableSize;
  /** Read by TableHead, which reports its size to a TableContainer (D128). */
  stickyHeader: boolean;
  sortable: boolean;
  sort: TableSortState | null;
  onSortChange?: (sort: TableSortState) => void;
  selectable: boolean;
  selected: ReadonlySet<string>;
  onSelectionChange?: (selected: ReadonlySet<string>) => void;
  /** The select-all checkbox's name (D128). */
  selectAllLabel: string;
  /** The start of every row checkbox's name (D128). */
  selectRowLabel: string;
}

export const TableContext = createContext<TableContextValue>({
  size: 40,
  stickyHeader: false,
  sortable: false,
  sort: null,
  selectable: false,
  selected: EMPTY_SELECTION,
  selectAllLabel: "Select all rows",
  selectRowLabel: "Select row",
});

/** Row ids in document order, published by Table so the select-all
 * checkbox can compute all/some without the consumer restating them. */
export const TableRowIdsContext = createContext<string[]>([]);

/** What a TableContainer offers its table's caption (D126): an id for a
 * caption that has none, and `register`, through which the caption reports the
 * id it ends up with (undefined when it unmounts), so the container can name
 * itself with aria-labelledby. undefined outside a container: a bare table's
 * caption gets no id. */
export interface TableContainerContextValue {
  offeredId: string;
  register: (id: string | undefined) => void;
  /** A sticky TableHead reports its block size in px (undefined when it stops
   * sticking or unmounts), which the container keeps clear of focus with
   * scroll-padding (D128). */
  setHeadSize: (px: number | undefined) => void;
}

export const TableContainerContext = createContext<TableContainerContextValue | undefined>(undefined);

/** What a selectable TableRow offers its row-header cell (D128): an id for a
 * cell that has none, and `register`, through which the cell reports the id it
 * ends up with, so the row's checkbox can be labelled by it. undefined outside
 * a selectable table: no row header gets a generated id there. */
export interface TableRowContextValue {
  offeredHeaderId: string;
  registerHeader: (id: string | undefined) => void;
}

export const TableRowContext = createContext<TableRowContextValue | undefined>(undefined);
