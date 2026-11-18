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
 * `NavItem`, with `aria-current="page"` on the current one. A theme can draw a
 * guide line down an open group's entries from under the group's icon, with
 * the current entry's bar as a segment of it, and colour icons apart from
 * their text, through tokens alone (D138): `--psi-nav-tree-guide-width`
 * (`0px`, off) and `--psi-nav-tree-guide-border`, the bar's
 * `--psi-nav-tree-indicator-width`, `-inset-block` and `-radius`, and
 * `--psi-nav-tree-item-icon-fg` and `--psi-nav-tree-group-icon-fg`
 * (`currentColor`). Psi places the line from the group's own geometry, and
 * only a group with an icon draws it. */
export function NavTree({ children, className, ref, ...rest }: NavTreeProps) {
  const cls = [styles.navTree, className].filter(Boolean).join(" ");
  return (
    <nav ref={ref} className={cls} {...rest}>
      <ul className={styles.list}>{children}</ul>
    </nav>
  );
}
