import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./nav-tree.module.css";

export interface NavTreeProps extends Omit<HTMLAttributes<HTMLElement>, "aria-label" | "children"> {
  /**
   * Accessible name of the navigation landmark, such as "Main". Required: an
   * app has more than one `<nav>` (a header's, a sidebar's), and an unnamed
   * one is indistinguishable from the rest. Declared here rather than
   * inherited so docgen keeps it in the manifest (D60).
   */
  "aria-label": string;
  /** `NavItem`s and `NavGroup`s — each renders an `<li>`. */
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the `<nav>`. */
  ref?: Ref<HTMLElement>;
}

/** A navigation tree (D88): a `<nav aria-label>` around a `<ul>` of `NavItem`s
 * and `NavGroup`s. Native elements only — *Tab* moves through the group
 * buttons and the links of open groups; there is no roving focus and no
 * `role="menu"` or `role="tree"`, because site navigation is a list of links,
 * not a widget. Router-agnostic: pass your router's link inside each
 * `NavItem`, with `aria-current="page"` on the current one. */
export function NavTree({ children, className, ref, ...rest }: NavTreeProps) {
  const cls = [styles.navTree, className].filter(Boolean).join(" ");
  return (
    <nav ref={ref} className={cls} {...rest}>
      <ul className={styles.list}>{children}</ul>
    </nav>
  );
}
