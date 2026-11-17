import type { HTMLAttributes, Ref } from "react";
import styles from "./count.module.css";

export interface CountProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The number, a non-negative integer. */
  value: number;
  /** The largest number shown as it is. A larger `value` shows as `${max}+`,
   * such as *999+*. Digits are plain, not locale-formatted. */
  max?: number;
  /** `neutral` is a quiet bare number. `attention` is a filled pill in the
   * warning tint and medium weight, so it differs by shape and weight, never
   * by colour alone. Give an `attention` count a `label`: the tone is visual
   * only. */
  tone?: "neutral" | "attention";
  /** What a screen reader reads in place of the number, such as "4 stuck".
   * Start it with the number shown, so a speech user can still name what
   * they see. Without it, the visible text is the count's text. */
  label?: string;
  className?: string;
  /** Forwarded ref to the `<span>`. */
  ref?: Ref<HTMLSpanElement>;
}

/** A count (D124): a number shown after a label, such as *Cards 238*, in a
 * `NavItem`'s `count`, or inline in a `Tab` or a `TableCaption` after a
 * space. Tabular numerals, capped at `max` (*999+*). Its text joins the name
 * of the link or button it sits in. It is never a live region: no `role` and
 * no `aria-live`, so a changing count announces nothing on its own. */
export function Count({ value, max = 999, tone = "neutral", label, className, ref, ...rest }: CountProps) {
  const text = value > max ? `${max}+` : String(value);
  const cls = [styles.count, tone === "attention" ? styles.attention : styles.neutral, className]
    .filter(Boolean)
    .join(" ");
  return (
    <span ref={ref} className={cls} {...rest}>
      {label === undefined ? (
        text
      ) : (
        <>
          <span aria-hidden="true">{text}</span>
          <span className="psi-sr-only">{label}</span>
        </>
      )}
    </span>
  );
}
