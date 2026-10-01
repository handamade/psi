import type { AnchorHTMLAttributes, ReactNode, Ref } from "react";
import styles from "./skip-link.module.css";

export interface SkipLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Fragment of the element to skip to, such as `"#main"`. The target must be
   * focusable (`tabIndex={-1}` is enough), or focus does not move. */
  href: string;
  /** Visible text, such as "Skip to content". */
  children: ReactNode;
  /** Forwarded ref to the anchor. */
  ref?: Ref<HTMLAnchorElement>;
}

/** A link to the page's main content, invisible until it takes keyboard focus
 * and then fixed at the inline-start top corner on a surface, drawing the
 * shared focus ring (D88). Render it first in the document.
 *
 * No script: native fragment navigation moves focus to a target that is
 * focusable, so the next *Tab* continues from inside it. `AppShell`'s `main`
 * is one (`tabIndex={-1}`); a bare `<main>` is not, so give it one.
 *
 * A modal `Dialog` makes the rest of the document inert, so the link never
 * needs to beat one. A `ToastRegion` is on the native top layer, which paints
 * above everything whatever its `z-index`: do not place one at `top-start`
 * (its default is `bottom-end`) in an app with a skip link, or it covers the
 * focused link. */
export function SkipLink({ className, ref, children, ...rest }: SkipLinkProps) {
  const cls = [styles.skipLink, className].filter(Boolean).join(" ");
  return (
    <a ref={ref} className={cls} {...rest}>
      {children}
    </a>
  );
}
