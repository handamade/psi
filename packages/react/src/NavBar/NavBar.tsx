import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./navbar.module.css";

export interface NavBarProps extends HTMLAttributes<HTMLElement> {
  /** Brand slot (wordmark / logo link), leading edge. */
  brand?: ReactNode;
  /** Trailing actions slot (theme switch, CTA). */
  actions?: ReactNode;
  /** Nav links. */
  children?: ReactNode;
  /** Forwarded ref to the header element. */
  ref?: Ref<HTMLElement>;
}

/** Top navigation bar with brand, nav-link, and trailing-action slots. */
export function NavBar({ brand, actions, children, className, ref, ...rest }: NavBarProps) {
  const cls = [styles.navbar, className].filter(Boolean).join(" ");
  return (
    <header ref={ref} className={cls} {...rest}>
      <div className={`psi-container ${styles.inner}`}>
        {brand != null && <div className={styles.brand}>{brand}</div>}
        <nav className={styles.links}>{children}</nav>
        {actions != null && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
