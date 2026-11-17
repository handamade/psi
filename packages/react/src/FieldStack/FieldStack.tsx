import { useMemo } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./field-stack.module.css";
import { FieldStackContext } from "./FieldStackContext.js";
import type { FieldLabelPosition } from "./FieldStackContext.js";

type Gap = 8 | 12 | 16 | 24;

export interface FieldStackProps extends HTMLAttributes<HTMLDivElement> {
  /** The form's Fields, top to bottom. Other content between them spans the
   * full width. */
  children?: ReactNode;
  /** Where every Field's label sits, unless the Field says otherwise (D115).
   * `"start"` puts the labels in one column as wide as the longest label, up
   * to `--psi-field-label-max-width`, and returns them above their controls
   * when the stack is narrower than 480px. @default "top" */
  labelPosition?: FieldLabelPosition;
  /** Space between Fields in px, from the space scale. @default 24 */
  gap?: Gap;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement>;
}

const gapClass: Record<Gap, string> = {
  8: styles.gap8, 12: styles.gap12, 16: styles.gap16, 24: styles.gap24,
};

/** A form's column of Fields (D115). With `labelPosition="start"` its Fields
 * share one label column. A plain <div> with no role. It measures its own
 * width, so it must fill its container: it is for a form, not a toolbar,
 * where a single `Field labelPosition="start"` goes. A Field shares the
 * columns only as a direct child; one inside a wrapper element keeps its
 * label beside its control in columns of its own. Every Field inside a
 * FieldStack takes its position, including one inside a nested container;
 * give a nested Field its own `labelPosition` to opt out.
 * It is capped at `--psi-field-stack-max-width` (640px) and sits at the start
 * of a wider container (D125); set the variable on a scope, `none` included,
 * to change the cap for one form. Size a short control with its Field's
 * `controlWidth`. */
export function FieldStack({ labelPosition = "top", gap = 24, className, children, ref, ...rest }: FieldStackProps) {
  const value = useMemo(() => ({ labelPosition }), [labelPosition]);
  const cls = [styles.stack, gapClass[gap], labelPosition === "start" && styles.start, className]
    .filter(Boolean)
    .join(" ");
  return (
    <div ref={ref} className={cls} {...rest} data-label-position={labelPosition}>
      <FieldStackContext.Provider value={value}>{children}</FieldStackContext.Provider>
    </div>
  );
}
