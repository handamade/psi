import { useContext } from "react";
import type { ReactNode } from "react";
import { MenuContext } from "./Menu.js";
import styles from "./menu.module.css";

export interface MenuItemProps {
  children: ReactNode;
  /** Fires on activation; Menu then reports the dismissal via onClose("item-select") (D50). */
  onSelect: () => void;
  /** danger is for destructive actions only (house rule). @default "neutral" */
  variant?: "neutral" | "danger";
  disabled?: boolean;
}

/** One action in a Menu. Renders a real <button> so activation, Enter and
 * Space come from the platform; the roving tabindex is applied by Menu's
 * keyboard hook, which finds items via [data-psi-menu-item] (D53). */
export function MenuItem({ children, onSelect, variant = "neutral", disabled = false }: MenuItemProps) {
  const { close } = useContext(MenuContext);

  return (
    <button
      type="button"
      role="menuitem"
      data-psi-menu-item
      data-variant={variant}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      className={styles.item}
      onClick={() => {
        if (disabled) return;
        onSelect();
        close("item-select");
      }}
    >
      {children}
    </button>
  );
}
