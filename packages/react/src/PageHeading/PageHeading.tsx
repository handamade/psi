import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./page-heading.module.css";

export interface PageHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** The page's title. */
  children?: ReactNode;
  /** Forwarded ref to the `h1`. */
  ref?: Ref<HTMLHeadingElement>;
}

/** The page's one heading (D118): an `h1` at 24/32 medium in the brand's
 * display face, margin 0. Use one per screen, as the first thing in the page;
 * inside an AppShell, the page's first child, after any `banner`. Margin 0
 * keeps the page one block padding below the header and below a banner
 * alike (D113). Sub-headings are `Text as="h2"` or `"h3"`. */
export function PageHeading({ className, children, ref, ...rest }: PageHeadingProps) {
  const cls = [styles.pageHeading, className].filter(Boolean).join(" ");
  return (
    <h1 ref={ref} className={cls} {...rest}>
      {children}
    </h1>
  );
}
