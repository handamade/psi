import type { HTMLAttributes, Ref } from "react";
import styles from "./description-list.module.css";

export interface DescriptionListProps extends HTMLAttributes<HTMLDListElement> {
  /** `stacked` puts the term above its value; `inline` puts them in a
   * two-column grid, which is what a detail drawer wants. @default "stacked" */
  layout?: "stacked" | "inline";
  /** Gap between pairs, in px. @default 12 */
  gap?: 8 | 12 | 16;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDListElement>;
}

/** Key/value display (D70): a `<dl>` of term/value pairs, the body
 * `detail-drawer` has always described and never had a component for.
 *
 * No `size` prop — this is type, and the type scale is already expressed by
 * --psi-text-*. Consumers restyle via the token family, not a prop. */
export function DescriptionList({
  layout = "stacked",
  gap = 12,
  className,
  children,
  ref,
  ...rest
}: DescriptionListProps) {
  return (
    <dl
      ref={ref}
      className={[styles.list, className].filter(Boolean).join(" ")}
      data-layout={layout}
      data-gap={gap}
      {...rest}
    >
      {children}
    </dl>
  );
}
