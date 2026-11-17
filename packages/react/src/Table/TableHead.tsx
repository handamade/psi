import { Children, cloneElement, isValidElement, useCallback, useContext, useLayoutEffect, useRef } from "react";
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import styles from "./table.module.css";
import { TableContainerContext, TableContext } from "./TableContext.js";
import { TableSelectAllCell } from "./TableSelectionCell.js";

export interface TableHeadProps extends Omit<HTMLAttributes<HTMLTableSectionElement>, "children"> {
  /** The header TableRow. */
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the `<thead>`. */
  ref?: Ref<HTMLTableSectionElement>;
}

/** `<thead>`. When the table is selectable, prepends the select-all cell to
 * the FIRST header row so the header's column count matches the body's — the
 * checkbox column is Table's, not the consumer's schema. Clones the row
 * rather than rebuilding it, so the consumer's own props on that `TableRow`
 * survive.
 *
 * A sticky header inside a TableContainer reports its block size to the
 * container, which keeps that much of its top clear when focus scrolls a row
 * into view (D128). */
export function TableHead({ children, className, ref, ...rest }: TableHeadProps) {
  const { selectable, stickyHeader } = useContext(TableContext);
  const container = useContext(TableContainerContext);
  const node = useRef<HTMLTableSectionElement | null>(null);

  const setRef = useCallback(
    (el: HTMLTableSectionElement | null) => {
      node.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as { current: HTMLTableSectionElement | null }).current = el;
    },
    [ref],
  );

  // Measured, not taken from the size ramp: a header measured 43px against a
  // 40px row token, and a label may wrap (D128). Without ResizeObserver
  // (jsdom, an old engine) it is measured once.
  const report = stickyHeader ? container?.setHeadSize : undefined;
  useLayoutEffect(() => {
    const el = node.current;
    if (!report || !el) return;
    const measure = () => report(el.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") return () => report(undefined);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
      report(undefined);
    };
  }, [report]);

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

  return (
    <thead {...rest} ref={setRef} className={[styles.head, className].filter(Boolean).join(" ")}>
      {rows}
    </thead>
  );
}
