import type { HTMLAttributes, Ref, ReactNode } from "react";
import styles from "./toolbar.module.css";

type Gap = 8 | 12 | 16;

export interface ToolbarProps extends HTMLAttributes<HTMLElement> {
  /** The controls. */
  children?: ReactNode;
  /** Gap between controls in px. @default 8 */
  gap?: Gap;
  /** Cross-axis alignment of the row's items. `center` (the default) centres
   * them, for a row of controls without visible labels such as
   * filter-toolbar. `end` and `start` are for a row of Fields with visible
   * labels beside an unlabelled button.
   * `end` (D87) lines items up on their bottom edge. It lines up each item's
   * *last* line, so a Field in an end-aligned row must end on its control —
   * no description or error line under it; use `start` for one.
   * `start` (D92) lines up the controls: items share their top edge, and a
   * *direct* `button` or `a` child drops by `--psi-toolbar-action-offset`
   * (one Field label line plus the Field gap) onto the control line. Only a
   * direct child is offset: a wrapped trigger (a Tooltip-wrapped button, a
   * Menu trigger) is not. A Field's description or error line hangs below
   * its control and moves nothing else. Every label in the row must fit on
   * one line; a label that wraps pushes its control below the others.
   * @default "center" */
  align?: "center" | "end" | "start";
  /** Root element. `form` renders a real `<form>`, so a submit Button
   * submits it and Enter in a field does too; with `aria-label` it is a
   * named form landmark, so it takes no `role="group"` (D87). Wire
   * `onSubmit`. @default "div" */
  as?: "div" | "form";
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement | HTMLFormElement>;
}

const gapClass: Record<Gap, string> = { 8: styles.gap8, 12: styles.gap12, 16: styles.gap16 };
const alignClass: Record<NonNullable<ToolbarProps["align"]>, string | undefined> = {
  center: undefined,
  end: styles.alignEnd,
  start: styles.alignStart,
};

/** Horizontal grouping row for filter/search controls (D52). Wraps on
 * overflow; zero JS. Deliberately NOT ARIA role="toolbar" — that role
 * contracts roving-tabindex arrow-key navigation, wrong for form controls.
 * With aria-label it announces as role="group"; as a form, as a named form
 * landmark instead (D87). */
export function Toolbar({ gap = 8, align = "center", as = "div", className, children, ref, ...rest }: ToolbarProps) {
  const cls = [styles.toolbar, gapClass[gap], alignClass[align], className]
    .filter(Boolean)
    .join(" ");
  if (as === "form") {
    return (
      <form ref={ref as Ref<HTMLFormElement>} className={cls} {...rest}>
        {children}
      </form>
    );
  }
  return (
    <div
      ref={ref as Ref<HTMLDivElement>}
      role={rest["aria-label"] != null ? "group" : undefined}
      className={cls}
      {...rest}
    >
      {children}
    </div>
  );
}
