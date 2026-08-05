import { createContext } from "react";
import type { TableSize, TableSortState } from "./Table.js";

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
  selected: new Set<string>(),
});
