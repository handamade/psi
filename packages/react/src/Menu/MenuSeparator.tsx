import styles from "./menu.module.css";

/** Hairline rule between Menu item groups. No props by design (D53). */
export function MenuSeparator() {
  return <div role="separator" data-psi-menu-separator className={styles.separator} />;
}
