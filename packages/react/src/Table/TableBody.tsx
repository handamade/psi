import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./table.module.css";

export interface TableBodyProps extends Omit<HTMLAttributes<HTMLTableSectionElement>, "children"> {
  /** The body TableRows. */
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the `<tbody>`. */
  ref?: Ref<HTMLTableSectionElement>;
}

/** `<tbody>` wrapper. Remaining attributes land on it (D85) — `aria-busy`
 * while a page of rows loads, say. */
export function TableBody({ children, className, ref, ...rest }: TableBodyProps) {
  return (
    <tbody {...rest} ref={ref} className={[styles.body, className].filter(Boolean).join(" ")}>
      {children}
    </tbody>
  );
}
