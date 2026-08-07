import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./description-list.module.css";

export interface DescriptionItemProps extends HTMLAttributes<HTMLDivElement> {
  /** The value — renders the <dd>. */
  children?: ReactNode;
  /** The term — renders the `<dt>`. */
  term: ReactNode;
  /** Forwarded ref to the group wrapper. */
  ref?: Ref<HTMLDivElement>;
}

/** One term/value pair. The term is a prop and the value is children,
 * matching Field's `label` idiom rather than inventing a two-slot shape.
 *
 * Renders `<div><dt/><dd/></div>`. The wrapper is the HTML5-sanctioned
 * grouping element for a `<dl>`, so the `<dt>`/`<dd>` association assistive
 * tech relies on is intact — and it keeps both layouts to one CSS rule each
 * instead of fighting a single grid to space pairs differently from the
 * term/value inside a pair. */
export function DescriptionItem({ term, className, children, ref, ...rest }: DescriptionItemProps) {
  return (
    <div ref={ref} className={[styles.item, className].filter(Boolean).join(" ")} {...rest}>
      <dt className={styles.term}>{term}</dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  );
}
