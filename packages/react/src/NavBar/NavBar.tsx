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
  /** Line the brand slot up with an `AppShell` sidebar (D140). With
   * `"sidebar"` the row is laid out `fluid`, and the brand slot spans the
   * sidebar's width (`--psi-navbar-brand-width`, the sidebar's
   * `--psi-app-shell-sidebar-width`) from `--psi-navbar-brand-inset` (12px), so a
   * leading 32px `IconButton` holding a 16px icon, such as a Menu toggle with
   * `<IconMenu size={16} />`, puts its icon on the column where the sidebar's
   * `NavTree` icons start. The links or actions
   * then start where the page in `main` starts. The brand keeps its width when
   * the sidebar is closed, so the toggle does not move under the pointer.
   * Logical properties: it mirrors in right-to-left. */
  brandAlign?: "sidebar";
  /** Forwarded ref to the header element. */
  ref?: Ref<HTMLElement>;
}

/** Top navigation bar with brand, nav-link, and trailing-action slots. Plain text
 * in a slot takes `--psi-navbar-fg`, the foreground of the theme on the bar, so
 * `data-psi-theme` on the `NavBar` reaches it (D111). */
export function NavBar({ brand, actions, children, navLabel, fluid = false, brandAlign, className, ref, ...rest }: NavBarProps) {
  const alignSidebar = brandAlign === "sidebar";
  const cls = [styles.navbar, alignSidebar && styles.brandSidebar, className].filter(Boolean).join(" ");
  const hasLinks = Children.toArray(children).length > 0;
  return (
    <header ref={ref} className={cls} {...rest}>
      <div className={`${fluid || alignSidebar ? styles.fluid : "psi-container"} ${styles.inner}`}>
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
