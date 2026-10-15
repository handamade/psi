import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./text.module.css";

type Size = 12 | 14 | 16 | 18;
type Weight = "regular" | "medium";

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /** The text. */
  children?: ReactNode;
  /** The element. A heading's level follows the document outline, its size
   * the design, so `as` and `size` are separate. @default "p" */
  as?: "p" | "span" | "div" | "h2" | "h3" | "h4";
  /** Font size in px; each size carries its own line height. @default 14 */
  size?: Size;
  /** @default "regular" */
  weight?: Weight;
  /** `secondary` for supporting text. @default "primary" */
  tone?: "primary" | "secondary";
  /** Forwarded ref to the element. */
  ref?: Ref<HTMLElement>;
}

const styleClass: Record<`${Size}${Weight}`, string> = {
  "12regular": styles.s12Regular, "12medium": styles.s12Medium,
  "14regular": styles.s14Regular, "14medium": styles.s14Medium,
  "16regular": styles.s16Regular, "16medium": styles.s16Medium,
  "18regular": styles.s18Regular, "18medium": styles.s18Medium,
};

/** A line or paragraph of text at one of Psi's text styles (D109). It gives a
 * pattern tree an element per line, so a headline and its explanation do not
 * run together. Margin 0: a Stack's gap does the spacing. */
export function Text({
  as: Tag = "p",
  size = 14,
  weight = "regular",
  tone = "primary",
  className,
  children,
  ref,
  ...rest
}: TextProps) {
  const cls = [styles.text, styleClass[`${size}${weight}`], tone === "secondary" && styles.secondary, className]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag ref={ref as Ref<never>} className={cls} {...rest}>
      {children}
    </Tag>
  );
}
