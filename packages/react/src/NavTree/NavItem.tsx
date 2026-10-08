import { cloneElement, Fragment, isValidElement } from "react";
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import styles from "./nav-tree.module.css";

export interface NavItemProps extends Omit<HTMLAttributes<HTMLLIElement>, "children"> {
  /** Without `href`: one anchor, your router's link. With `href`: the link's
   * text. */
  children: ReactNode;
  /** Render the anchor yourself (D88), for a plain link or a preset: the
   * `<li>` holds `<a href>` with `children` as its text. Router apps leave it
   * out and pass their own link as the child, so the link keeps its own
   * handlers. */
  href?: string;
  /** Mark the link as the current page (`aria-current="page"`): on the
   * anchor `href` renders, or on the single element you pass as a child (D93).
   * Without `current`, a child's own `aria-current` is left alone, so a router
   * that marks its active link keeps working. */
  current?: boolean;
  className?: string;
  /** Forwarded ref to the `<li>`. */
  ref?: Ref<HTMLLIElement>;
}

/** One entry of a `NavTree` (D88): an `<li>` that styles the single anchor
 * inside it. Router apps pass their own link as the child, so it keeps its
 * `href` and handlers; with `current`, `NavItem` clones it to add
 * `aria-current="page"` (D93), as `Menu` clones its trigger. `href` is for
 * plain links and for presets, where the compose tree can hold only manifest
 * components and a raw `<a>` is not one. The current page is never marked by
 * colour alone: medium weight, a raised surface and a bar at the inline
 * start. */
export function NavItem({ children, href, current, className, ref, ...rest }: NavItemProps) {
  const cls = [styles.item, className].filter(Boolean).join(" ");
  // D93: `current` reaches a link the consumer passes as the child. Only a
  // single element (not a Fragment) can carry the attribute; a string or
  // several children are left as they are. Without `current` nothing is
  // cloned, so the child's own `aria-current` survives.
  const onlyChild =
    href === undefined && current && isValidElement(children) && children.type !== Fragment
      ? (children as ReactElement<{ "aria-current"?: string }>)
      : null;
  return (
    <li ref={ref} className={cls} {...rest}>
      {href !== undefined ? (
        <a href={href} aria-current={current ? "page" : undefined}>
          {children}
        </a>
      ) : onlyChild ? (
        cloneElement(onlyChild, { "aria-current": "page" })
      ) : (
        children
      )}
    </li>
  );
}
