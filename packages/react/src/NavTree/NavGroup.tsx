import { useId } from "react";
import type { ReactNode } from "react";
import { IconChevronDown } from "../icons/IconChevronDown.js";
import styles from "./navtree.module.css";

export interface NavGroupProps {
  /** The group's visible label, such as "Reports". */
  label: ReactNode;
  /** Whether the group's items are shown. Controlled. */
  open: boolean;
  /** Called with the next state when the button is pressed. The group never
   * changes `open` itself. */
  onOpenChange: (open: boolean) => void;
  /** `NavItem`s of the group. */
  children: ReactNode;
  className?: string;
}

/** A collapsible group of `NavItem`s in a `NavTree` (D88). Controlled-only,
 * like `Tabs` (D67): `open` and `onOpenChange` are required and nothing is
 * remembered. Renders a native `<button aria-expanded aria-controls>` over a
 * `<ul>` that is `hidden` when closed, so the items leave the layout and the
 * accessibility tree while `aria-controls` keeps naming an element. The
 * chevron turns with the state and is `aria-hidden`: the label and
 * `aria-expanded` carry the meaning. */
export function NavGroup({ label, open, onOpenChange, children, className }: NavGroupProps) {
  const listId = useId();
  const cls = [styles.group, className].filter(Boolean).join(" ");
  return (
    <li className={cls}>
      <button
        type="button"
        className={styles.groupButton}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => onOpenChange(!open)}
      >
        <span className={styles.groupLabel}>{label}</span>
        <IconChevronDown size={16} className={styles.chevron} aria-hidden="true" />
      </button>
      <ul id={listId} className={styles.groupList} hidden={!open}>
        {children}
      </ul>
    </li>
  );
}
