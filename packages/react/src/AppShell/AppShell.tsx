import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./app-shell.module.css";

export interface AppShellProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** A `SkipLink` (D88), rendered first so it is the first tab stop. Point its
   * `href` at `#` plus `mainId`. */
  skipLink?: ReactNode;
  /** The header row, usually a `NavBar` (D88). It sits in a row of its own
   * above the sidebar and `main`, so nothing scrolls under it. */
  header?: ReactNode;
  /** The sidebar's content, usually a `NavTree` (D88). The shell wraps it in a
   * `<div>`, not an `<aside>`: a `NavTree` is already the landmark. */
  sidebar?: ReactNode;
  /** The page, rendered inside `<main>` (D88). */
  children?: ReactNode;
  /** Whether the sidebar is shown. Controlled: wire your Menu toggle's
   * `aria-expanded` and this to one piece of state. Closed, the sidebar is
   * `hidden`, so it leaves the layout and the accessibility tree, and stays in
   * the DOM so the toggle's `aria-controls` keeps naming an element (D88).
   * @default true */
  sidebarOpen?: boolean;
  /** A theme name for the sidebar alone, such as `"dark"`: sets
   * `data-psi-theme` on the sidebar element, so every token inside re-resolves
   * under that theme while the rest of the page keeps its own (D88). The
   * sidebar paints `--psi-bg-primary` itself; a theme paints no background. */
  sidebarTheme?: string;
  /** `id` of the sidebar element, which a toggle names with `aria-controls`
   * (D88). @default "sidebar" */
  sidebarId?: string;
  /** `id` of `<main>`, which a `SkipLink`'s `href` names (D88). @default "main" */
  mainId?: string;
  className?: string;
  /** Forwarded ref to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/** The frame of an application (D88): a header row over a sidebar and a
 * `<main>` that each scroll on their own, filling the viewport (`100dvh`).
 * Because the header has a row of its own and `main` is its own scroller,
 * nothing scrolls under the header, so a focused element is never obscured by
 * it (WCAG 2.2 *Focus Not Obscured*) without `scroll-padding`.
 *
 * `main` carries `id={mainId}` and `tabIndex={-1}`: the target of a `SkipLink`,
 * not a tab stop; focused by the skip link it draws the shared focus ring
 * inside its box. A closed sidebar is `hidden`, not narrowed to icons; there is
 * no responsive drawer and no stored open state, so this is a desktop frame.
 * A page whose document must scroll as a whole does not use `AppShell`. Mount it
 * at the root of the page with no margin or padding around it: it is `100dvh`
 * tall, so anything around it makes the document scroll and slides the frame.
 *
 * Do not place a `ToastRegion` at `top-start` in an app with a skip link: the
 * native top layer paints over the focused link. */
export function AppShell({
  skipLink,
  header,
  sidebar,
  children,
  sidebarOpen = true,
  sidebarTheme,
  sidebarId = "sidebar",
  mainId = "main",
  className,
  ref,
  ...rest
}: AppShellProps) {
  // No sidebar content is the same layout as a closed one: no empty column.
  const showSidebar = sidebarOpen && sidebar != null;
  const cls = [styles.appShell, !showSidebar && styles.sidebarClosed, className].filter(Boolean).join(" ");
  return (
    <div ref={ref} className={cls} {...rest}>
      {skipLink}
      {header != null && <div className={styles.header}>{header}</div>}
      <div id={sidebarId} className={styles.sidebar} hidden={!showSidebar} data-psi-theme={sidebarTheme}>
        {sidebar}
      </div>
      <main id={mainId} className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
