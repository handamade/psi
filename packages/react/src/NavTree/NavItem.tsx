import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./navtree.module.css";

export interface NavItemProps extends Omit<HTMLAttributes<HTMLLIElement>, "children"> {
  /** One anchor: your router's link. Put `aria-current="page"` on the current
   * one — `NavItem` styles it by weight, a surface and an inline-start bar. */
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the `<li>`. */
  ref?: Ref<HTMLLIElement>;
}

/** One entry of a `NavTree` (D88): an `<li>` that styles the single anchor
 * inside it. It renders no anchor itself, so any router's link works and the
 * link keeps its own `href`, `aria-current` and handlers. The current page is
 * never marked by colour alone: medium weight, a raised surface and a bar at
 * the inline start. */
export function NavItem({ children, className, ref, ...rest }: NavItemProps) {
  const cls = [styles.item, className].filter(Boolean).join(" ");
  return (
    <li ref={ref} className={cls} {...rest}>
      {children}
    </li>
  );
}
