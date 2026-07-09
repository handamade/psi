import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./card.module.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** stacked = media above body; featured = media beside body (~1.6fr/1fr), stacks under md. @default "stacked" */
  variant?: "stacked" | "featured";
  /** Media slot rendered edge-to-edge (img, AspectRatio, …). */
  media?: ReactNode;
  /** Lift on hover: translateY(-6px) over --ds-duration-350. @default false */
  hoverLift?: boolean;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement>;
}

export function Card({
  variant = "stacked",
  media,
  hoverLift = false,
  className,
  children,
  ref,
  ...rest
}: CardProps) {
  const cls = [
    styles.card,
    variant === "featured" ? styles.featured : styles.stacked,
    hoverLift ? styles.hoverLift : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={cls} {...rest}>
      {media != null && <div className={styles.media}>{media}</div>}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
