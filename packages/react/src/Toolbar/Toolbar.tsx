import type { HTMLAttributes, Ref } from "react";
import styles from "./toolbar.module.css";

type Gap = 8 | 12 | 16;

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Gap between controls in px. @default 8 */
  gap?: Gap;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement>;
}

const gapClass: Record<Gap, string> = { 8: styles.gap8, 12: styles.gap12, 16: styles.gap16 };

/** Horizontal grouping row for filter/search controls (D52). Wraps on
 * overflow; zero JS. Deliberately NOT ARIA role="toolbar" — that role
 * contracts roving-tabindex arrow-key navigation, wrong for form controls.
 * With aria-label it announces as role="group". */
export function Toolbar({ gap = 8, className, children, ref, ...rest }: ToolbarProps) {
  const cls = [styles.toolbar, gapClass[gap], className].filter(Boolean).join(" ");
  return (
    <div ref={ref} role={rest["aria-label"] != null ? "group" : undefined} className={cls} {...rest}>
      {children}
    </div>
  );
}
