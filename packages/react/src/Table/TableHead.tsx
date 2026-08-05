import type { ReactNode } from "react";
import styles from "./table.module.css";

export interface TableHeadProps {
  children: ReactNode;
  className?: string;
}

/** `<thead>` wrapper. */
export function TableHead({ children, className }: TableHeadProps) {
  return <thead className={[styles.head, className].filter(Boolean).join(" ")}>{children}</thead>;
}
