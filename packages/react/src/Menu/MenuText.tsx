import type { ReactNode } from "react";
import styles from "./menu.module.css";

export interface MenuTextProps {
  /** The line's text: information, not an action. */
  children: ReactNode;
  /** Give it an id and pass the same id to Menu's `aria-describedby` to make
   * the line the menu's description (D99). Off by default. */
  id?: string;
}

/** A line of text in a Menu that is not an action (D99): a build identifier,
 * a signed-in account. It sits inside the `role="menu"` element with no role
 * of its own, so it is in the accessibility tree as a child of the menu; it
 * is never focused, and the arrows, Home, End and typeahead skip it, since
 * Menu's keyboard moves only between `[data-psi-menu-item]` elements. It is
 * never `aria-hidden`: it exists to be read. In a menu's focus mode a screen
 * reader reaches it by browse mode or the VoiceOver cursor; to have it spoken
 * on entering the menu, make it the menu's description. */
export function MenuText({ children, id }: MenuTextProps) {
  return (
    <div id={id} data-psi-menu-text className={styles.text}>
      {children}
    </div>
  );
}
