import { cloneElement, Fragment, isValidElement, useEffect } from "react";
import type { AnchorHTMLAttributes, ReactElement, ReactNode, Ref } from "react";

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Render the anchor yourself: `<a href>` with `children` as its text. Do
   * not also pass a link element as the child: that nests `<a>` in `<a>`.
   * Router apps leave it out and pass their own link as the only child. */
  href?: string;
  /** Mark the link as the current page (`aria-current="page"`): on the anchor
   * `href` renders, or on the single element you pass as a child. Without
   * `current`, a child's own `aria-current` is left alone. */
  current?: boolean;
  /** With `href`: the link's text. Without: one link element, your router's. */
  children: ReactNode;
  /** Forwarded ref to the anchor `href` renders. With a child link, put the
   * ref on your link. */
  ref?: Ref<HTMLAnchorElement>;
}

const LINK_CLASS = "psi-link";
const join = (...names: (string | undefined)[]) => names.filter(Boolean).join(" ");

/** A text link (D119): the accent colour, underlined at rest, never marked by
 * colour alone. Its rules are the `.psi-link` utility in utilities.css, which
 * `Link` applies. With `href` it renders the anchor. Without, a router app
 * passes its own link as the only child, and `Link` clones it to add the class
 * and, with `current`, `aria-current="page"`, as `NavItem` does (D93). In that
 * form, `Link`'s other anchor props and `ref` are not applied: put them on
 * your link. The font is inherited, so a standalone link sits in a `Text`.
 * Inside a `NavItem` or among `NavBar`'s links, pass your router link itself,
 * not `Link`: the utility layer would win over the nav's link styles. For an action that should look
 * like a button, use `Button href`. */
export function Link({ href, current, className, children, ref, ...rest }: LinkProps) {
  const child =
    href === undefined && isValidElement(children) && children.type !== Fragment
      ? (children as ReactElement<{ className?: string | ((state: never) => string | undefined); "aria-current"?: AnchorHTMLAttributes<HTMLAnchorElement>["aria-current"] }>)
      : null;
  const unstyled = href === undefined && child === null;

  useEffect(() => {
    if (!unstyled || process.env.NODE_ENV === "production") return;
    console.warn("Link: pass href, or one link element as the child; nothing was styled.");
  }, [unstyled]);

  if (href !== undefined) {
    return (
      <a
        ref={ref}
        href={href}
        {...rest}
        className={join(LINK_CLASS, className)}
        {...(current ? { "aria-current": "page" as const } : {})}
      >
        {children}
      </a>
    );
  }
  if (child) {
    const own = child.props.className;
    return cloneElement(child, {
      // A router's className may be a function of its state (NavLink).
      className:
        typeof own === "function"
          ? (state: never) => join(LINK_CLASS, own(state), className)
          : join(LINK_CLASS, own, className),
      ...(current ? { "aria-current": "page" as const } : {}),
    });
  }
  return <>{children}</>;
}
