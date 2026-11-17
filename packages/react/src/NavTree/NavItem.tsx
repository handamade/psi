import { cloneElement, Fragment, isValidElement, useEffect } from "react";
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
  /** An icon before the text (D124), such as `<IconSettings />`, passed
   * without a size: the entry sizes it (`--psi-nav-tree-icon-size`) and
   * colours it with the text. Always decorative: it is wrapped in
   * `aria-hidden`, and the text is the name. Needs `href`, or one link
   * element as the child. */
  icon?: ReactNode;
  /** A `<Count>` after the text (D124), at the row's inline end. Its text
   * joins the link's name ("Cards 238"). Needs `href`, or one link element as
   * the child. */
  count?: ReactNode;
  className?: string;
  /** Forwarded ref to the `<li>`. */
  ref?: Ref<HTMLLIElement>;
}

const present = (node: ReactNode) => node !== undefined && node !== null && node !== false;

/** Icon, label and count, in that order, as the content of the entry's link
 * (D124). A space sits before the count's slot, so the name reads "Cards 238"
 * in any accessibility tree, jsdom's included. */
function entryContent(label: ReactNode, icon: ReactNode, count: ReactNode) {
  return (
    <>
      {present(icon) ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{label}</span>
      {present(count) ? (
        <>
          {" "}
          <span className={styles.countSlot}>{count}</span>
        </>
      ) : null}
    </>
  );
}

/** One entry of a `NavTree` (D88): an `<li>` that styles the single anchor
 * inside it. Router apps pass their own link as the child, so it keeps its
 * `href` and handlers; with `current`, `NavItem` clones it to add
 * `aria-current="page"` (D93), as `Menu` clones its trigger. `href` is for
 * plain links and for presets, where the compose tree can hold only manifest
 * components and a raw `<a>` is not one. The current page is never marked by
 * colour alone: medium weight, a raised surface and a bar at the inline
 * start. A child link you mark `aria-current="true"` is the entry the current
 * screen sits under (D96): medium weight and the current colour, with no
 * surface and no bar. `NavItem` itself never sets `true`. `icon` and `count` (D124) go inside the
 * link: with `href` in the anchor `NavItem` renders, with a router link by
 * cloning it with icon, label and count as its content. Without either, the
 * markup is unchanged. */
export function NavItem({ children, href, current, icon, count, className, ref, ...rest }: NavItemProps) {
  const cls = [styles.item, className].filter(Boolean).join(" ");
  const decorated = present(icon) || present(count);
  // D93: only a single element (not a Fragment) can be cloned. It is cloned
  // for `current` (to add aria-current="page") and, D124, for an icon or a
  // count (to fill it). Otherwise nothing is cloned, so the child's own
  // aria-current survives.
  const child =
    href === undefined && isValidElement(children) && children.type !== Fragment
      ? (children as ReactElement<{ "aria-current"?: string; children?: ReactNode }>)
      : null;
  const dropped = decorated && href === undefined && child === null;

  useEffect(() => {
    if (!dropped || process.env.NODE_ENV === "production") return;
    console.warn("NavItem: icon and count need href, or one link element as the child; they were not rendered.");
  }, [dropped]);

  let content: ReactNode = children;
  if (href !== undefined) {
    content = (
      <a href={href} aria-current={current ? "page" : undefined}>
        {decorated ? entryContent(children, icon, count) : children}
      </a>
    );
  } else if (child && (current || decorated)) {
    const extra = current ? { "aria-current": "page" } : {};
    content = decorated
      ? cloneElement(child, extra, entryContent(child.props.children, icon, count))
      : cloneElement(child, extra);
  }

  return (
    <li ref={ref} className={cls} {...rest}>
      {content}
    </li>
  );
}
