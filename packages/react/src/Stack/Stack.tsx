import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./stack.module.css";

type Gap = 4 | 8 | 12 | 16 | 24 | 32;

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** Stack contents, laid out top to bottom. */
  children?: ReactNode;
  /** Space between children in px, from the space scale. @default 16 */
  gap?: Gap;
  /** Cross-axis alignment. `stretch` (the default) makes each child full
   * width; `start` keeps a Button or a short line at its own width. */
  align?: "stretch" | "start" | "center" | "end";
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement>;
}

const gapClass: Record<Gap, string> = {
  4: styles.gap4, 8: styles.gap8, 12: styles.gap12, 16: styles.gap16, 24: styles.gap24, 32: styles.gap32,
};
const alignClass: Record<NonNullable<StackProps["align"]>, string | undefined> = {
  stretch: undefined,
  start: styles.alignStart,
  center: styles.alignCenter,
  end: styles.alignEnd,
};

/** A column with a gap from the space scale (D109): Toolbar's vertical
 * counterpart, minus the wrap. A plain <div> with no role. It gives a pattern
 * tree a layout context, which Panel and the psi-gap-* utilities do not. */
export function Stack({ gap = 16, align = "stretch", className, children, ref, ...rest }: StackProps) {
  const cls = [styles.stack, gapClass[gap], alignClass[align], className].filter(Boolean).join(" ");
  return (
    <div ref={ref} className={cls} {...rest}>
      {children}
    </div>
  );
}
