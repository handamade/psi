import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./nav-tree.module.css";

export interface NavItemProps extends Omit<HTMLAttributes<HTMLLIElement>, "children"> {
  /** Without `href`: one anchor, your router's link — put `aria-current="page"`
   * on the current one. With `href`: the link's text. */
  children: ReactNode;
  /** Render the anchor yourself (D88), for a plain link or a preset: the
   * `<li>` holds `<a href>` with `children` as its text. Router apps leave it
   * out and pass their own link as the child, so the link keeps its own
   * handlers. */
  href?: string;
  /** Mark the link as the current page (`aria-current="page"`). Only with
   * `href`; a link you pass as a child carries its own `aria-current`. */
  current?: boolean;
  className?: string;
  /** Forwarded ref to the `<li>`. */
  ref?: Ref<HTMLLIElement>;
}

/** One entry of a `NavTree` (D88): an `<li>` that styles the single anchor
 * inside it. Router apps pass their own link as the child, so it keeps its
 * `href`, `aria-current` and handlers; `href` is for plain links and for
 * presets, where the compose tree can hold only manifest components and a raw
 * `<a>` is not one. The current page is never marked by colour alone: medium
 * weight, a raised surface and a bar at the inline start. */
export function NavItem({ children, href, current, className, ref, ...rest }: NavItemProps) {
  const cls = [styles.item, className].filter(Boolean).join(" ");
  return (
    <li ref={ref} className={cls} {...rest}>
      {href !== undefined ? (
        <a href={href} aria-current={current ? "page" : undefined}>
          {children}
        </a>
      ) : (
        children
      )}
    </li>
  );
}
