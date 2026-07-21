import type { HTMLAttributes, Ref } from "react";
import styles from "./panel.module.css";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Inner padding in px. @default 24 */
  padding?: 16 | 24;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement>;
}

/** Elevated surface panel (D51): secondary background, faint hairline,
 * radius-12 — the shared --psi-surface-* recipe Dialog's panel also binds.
 * Not a Card: no media slot, no hover lift, opaque by design. */
export function Panel({ padding = 24, className, children, ref, ...rest }: PanelProps) {
  const cls = [styles.panel, padding === 16 ? styles.padding16 : undefined, className]
    .filter(Boolean)
    .join(" ");
  return (
    <div ref={ref} className={cls} {...rest}>
      {children}
    </div>
  );
}
