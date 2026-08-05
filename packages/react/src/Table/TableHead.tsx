import { Children, cloneElement, isValidElement, useContext } from "react";
import type { ReactElement, ReactNode } from "react";
import styles from "./table.module.css";
import { TableContext } from "./TableContext.js";
import { TableSelectAllCell } from "./TableSelectionCell.js";

export interface TableHeadProps {
  children: ReactNode;
  className?: string;
}

/** `<thead>`. When the table is selectable, prepends the select-all cell to
 * the FIRST header row so the header's column count matches the body's — the
 * checkbox column is Table's, not the consumer's schema. Clones the row
 * rather than rebuilding it, so the consumer's own props on that `TableRow`
 * survive. */
export function TableHead({ children, className }: TableHeadProps) {
  const { selectable } = useContext(TableContext);

  let injected = false;
  const rows = selectable
    ? Children.map(children, (child) => {
        if (injected || !isValidElement(child)) return child;
        injected = true;
        const row = child as ReactElement<{ children?: ReactNode }>;
        return cloneElement(
          row,
          undefined,
          <>
            <TableSelectAllCell />
            {row.props.children}
          </>,
        );
      })
    : children;

  return <thead className={[styles.head, className].filter(Boolean).join(" ")}>{rows}</thead>;
}
