import type { HTMLAttributes, Ref } from "react";
import styles from "./skeleton.module.css";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** `text` renders `lines` stacked bars; `block` one box. @default "text" */
  variant?: "text" | "block";
  /** Number of text lines; the last of several is shorter. Text only. @default 1 */
  lines?: number;
  /** Height of a block, from the size scale. Block only. @default 40 */
  size?: 24 | 32 | 40 | 48;
  className?: string;
  /** Forwarded ref to the underlying `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/** A loading placeholder. It is not a live region: it renders no `role` and
 * no `aria-live`, and it is always `aria-hidden="true"`, so assistive tech
 * skips it entirely. Put `aria-busy` on the region the skeleton stands for —
 * that is what tells a screen reader the content is coming.
 *
 * Its width fills the container; size the container, not the skeleton. The
 * pulse is an opacity animation that stops under
 * `prefers-reduced-motion: reduce` (D86). */
export function Skeleton({
  variant = "text",
  lines = 1,
  size = 40,
  className,
  ref,
  ...rest
}: SkeletonProps) {
  const cls = [styles.skeleton, className].filter(Boolean).join(" ");
  const count = Math.max(1, Math.floor(lines));
  return (
    <div
      {...rest}
      ref={ref}
      className={cls}
      aria-hidden="true"
      data-psi-skeleton
      data-variant={variant}
      data-size={variant === "block" ? size : undefined}
    >
      {variant === "text" &&
        Array.from({ length: count }, (_, i) => <span key={i} className={styles.line} />)}
    </div>
  );
}
