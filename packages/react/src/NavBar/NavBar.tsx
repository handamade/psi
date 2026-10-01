import { Children } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./navbar.module.css";

export interface NavBarProps extends HTMLAttributes<HTMLElement> {
  /** Brand slot (wordmark / logo link), leading edge. */
  brand?: ReactNode;
  /** Trailing actions slot (theme switch, CTA). */
  actions?: ReactNode;
  /** Nav links. The `<nav>` renders only when there are children, so a bar with
   * a brand and actions and no links has no empty landmark (D88). */
  children?: ReactNode;
  /** Accessible name of the links' `<nav>` (its `aria-label`). Rest props land
   * on the `<header>`, so this is the only way to label the `<nav>` (D88). */
  navLabel?: string;
  /** Lay the row out at full width: it drops `psi-container` (the centred
   * max-width column) and keeps the `--psi-gutter` side padding. For an
   * application header over a full-width frame (D88). @default false */
  fluid?: boolean;
  /** Forwarded ref to the header element. */
  ref?: Ref<HTMLElement>;
}

/** Top navigation bar with brand, nav-link, and trailing-action slots. */
export function NavBar({ brand, actions, children, navLabel, fluid = false, className, ref, ...rest }: NavBarProps) {
  const cls = [styles.navbar, className].filter(Boolean).join(" ");
  const hasLinks = Children.toArray(children).length > 0;
  return (
    <header ref={ref} className={cls} {...rest}>
      <div className={`${fluid ? styles.fluid : "psi-container"} ${styles.inner}`}>
        {brand != null && <div className={styles.brand}>{brand}</div>}
        {hasLinks && (
          <nav className={styles.links} aria-label={navLabel}>
            {children}
          </nav>
        )}
        {actions != null && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
