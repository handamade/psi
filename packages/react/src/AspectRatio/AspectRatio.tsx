import type { HTMLAttributes, Ref } from "react";
import styles from "./aspect-ratio.module.css";

export interface AspectRatioProps extends HTMLAttributes<HTMLDivElement> {
  /** Width/height ratio, e.g. 16/10 or 4/5. */
  ratio: number;
  /** Forwarded ref to the frame element. */
  ref?: Ref<HTMLDivElement>;
}

/** Fixed-aspect-ratio box that sizes its child media. */
export function AspectRatio({ ratio, className, style, children, ref, ...rest }: AspectRatioProps) {
  const cls = [styles.frame, className].filter(Boolean).join(" ");
  return (
    <div ref={ref} className={cls} style={{ aspectRatio: String(ratio), ...style }} {...rest}>
      {children}
    </div>
  );
}
