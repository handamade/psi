import { useId } from "react";
import type { ReactNode } from "react";
import { IconChevronDown } from "../icons/IconChevronDown.js";
import styles from "./nav-tree.module.css";

export interface NavGroupProps {
  /** The group's visible label, such as "Reports". */
  label: ReactNode;
  /** An icon before the label (D124), passed without a size. Decorative
   * (`aria-hidden`), sized by `--psi-nav-tree-icon-size`, coloured with the
   * label. It stays when the group is closed: only the chevron turns. */
  icon?: ReactNode;
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
export function NavGroup({ label, icon, open, onOpenChange, children, className }: NavGroupProps) {
  const listId = useId();
  const hasIcon = icon !== undefined && icon !== null && icon !== false;
  // D124: with an icon, the group's items line up under the label's text.
  const cls = [styles.group, hasIcon ? styles.withIcon : null, className].filter(Boolean).join(" ");
  return (
    <li className={cls}>
      <button
        type="button"
        className={styles.groupButton}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => onOpenChange(!open)}
      >
        {hasIcon ? (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className={styles.groupLabel}>{label}</span>
        <IconChevronDown size={16} className={styles.chevron} aria-hidden="true" />
      </button>
      <ul id={listId} className={styles.groupList} hidden={!open}>
        {children}
      </ul>
    </li>
  );
}
