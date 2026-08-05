import type { ReactNode } from "react";
import styles from "./table.module.css";

export interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

/** `<tbody>` wrapper. */
export function TableBody({ children, className }: TableBodyProps) {
  return <tbody className={[styles.body, className].filter(Boolean).join(" ")}>{children}</tbody>;
}
