import { useLayoutEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./app-shell.module.css";
import { handBackFocus, isFocusLost, useLatestRef } from "../internal/focus/focusReturn.js";
import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";

/** Why AppShell hands focus back (D147). */
export type AppShellFocusReturnReason = "sidebar-close";

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
  /** One page-level `Banner`, or several, rendered inside `<main>` before the
   * page (D113). It sits edge to edge: its wrapper cancels main's padding on
   * three sides, and the page starts one block padding below it. It scrolls
   * with the page. A value that renders nothing, such as
   * `stale && <Banner …/>`, takes no space. */
  banner?: ReactNode;
  /** The page, rendered inside `<main>` (D88). */
  children?: ReactNode;
  /** Whether the sidebar is shown. Controlled: wire your Menu toggle's
   * `aria-expanded` and this to one piece of state. Closed, the sidebar is
   * `hidden`, so it leaves the layout and the accessibility tree, and stays in
   * the DOM so the toggle's `aria-controls` keeps naming an element (D88).
   * If focus is inside the sidebar when it closes, it moves to the toggle whose
   * `aria-controls` names the sidebar, or to `main` when there is none (D142).
   * @default true */
  sidebarOpen?: boolean;
  /** How the sidebar opens and closes (D142). `"instant"` shows and hides it at
   * once, as before. `"slide"` runs its column to 0 and back, fading it, with
   * main's corner following, over `--psi-app-shell-sidebar-duration` and
   * `--psi-app-shell-sidebar-ease`, which alias the `move` motion preset
   * (200ms, `--psi-ease-soft`); `prefers-reduced-motion` makes it instant. The
   * prop never takes a time: retime it with those two tokens.
   *
   * Closed under `"slide"`, the sidebar is `visibility: hidden` rather than
   * `hidden`: it leaves the tab order and the accessibility tree when the close
   * ends, and is reachable as soon as an open starts. Its content sits in one
   * inner `<div>` that scrolls, held at the sidebar's width so nothing reflows
   * while the column moves: code that scrolls the sidebar must scroll that
   * wrapper, not the element with `sidebarId`. With no `sidebar` content it is
   * the instant frame. @default "instant" */
  sidebarMotion?: "instant" | "slide";
  /** A theme name for the sidebar alone, such as `"dark"`: sets
   * `data-psi-theme` on the sidebar element, so every token inside re-resolves
   * under that theme while the rest of the page keeps its own (D88). The
   * sidebar paints `--psi-bg-primary` itself; a theme paints no background.
   * Its `color-scheme` follows the theme, so its scrollbars do too (D116). */
  sidebarTheme?: string;
  /** `id` of the sidebar element, which a toggle names with `aria-controls`
   * (D88). @default "sidebar" */
  sidebarId?: string;
  /** Called when the sidebar closes while focus is inside it and Psi is about
   * to move focus to the toggle, or to `main` (D142, D147): `event.target` is
   * where it is going. Focus your own element in the handler to take over, or
   * call `preventDefault()` to leave focus where it is. See the Focus guide. */
  onFocusReturn?: (event: FocusReturnEvent<AppShellFocusReturnReason>) => void;
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
 * `sidebarMotion="slide"` animates the open and close instead: the column runs
 * to 0 over the `move` motion preset (D142).
 * A page whose document must scroll as a whole does not use `AppShell`. Mount it
 * at the root of the page with no margin or padding around it: it is `100dvh`
 * tall, so anything around it makes the document scroll and slides the frame.
 *
 * Do not place a `ToastRegion` at `top-start` in an app with a skip link: the
 * native top layer paints over the focused link.
 *
 * A theme can make `main` a surface beside a one-colour header and sidebar, with
 * no CSS of the consumer's (D110): `--psi-app-shell-bg`, which must equal the
 * canvas of the theme on the header and the sidebar, `--psi-app-shell-main-bg`
 * and `--psi-app-shell-main-radius`. All three paint nothing by default. The
 * corner is square unless a header and a sidebar both meet `main`. Put the
 * header under that theme with `data-psi-theme` on the `NavBar`, whose rest
 * props land on its `<header>`, and remove its line with
 * `--psi-navbar-border-width: 0`.
 *
 * `main` pads the page from `--psi-app-shell-main-padding-inline` and
 * `--psi-app-shell-main-padding-block`, 24px by default (D113); set both to `0`
 * if your page pads itself. A page that wants a maximum width sets
 * `max-inline-size` itself: `.psi-container` would add a gutter of its own.
 * The sidebar draws a line on its inline-end edge when
 * `--psi-app-shell-sidebar-border-width` is `1px`; it is `0` by default, and
 * its colour is `--psi-app-shell-sidebar-border` (D114). Geometry set on the
 * shell's root, in the page's theme or at `:root` reaches a sidebar or header
 * under its own theme: a sub-theme declares only colour tokens again (D139).
 *
 * `<NavBar brandAlign="sidebar">` in `header` lines its brand up with the
 * sidebar: the brand spans the sidebar's width and a leading 32px `IconButton`
 * with a 16px icon puts it on the sidebar's icon column (D140). The sidebar
 * insets its tree by `--psi-app-shell-sidebar-padding`, 8px. */
export function AppShell({
  skipLink,
  header,
  sidebar,
  banner,
  children,
  sidebarOpen = true,
  sidebarMotion = "instant",
  sidebarTheme,
  sidebarId = "sidebar",
  mainId = "main",
  onFocusReturn,
  className,
  ref,
  ...rest
}: AppShellProps) {
  // No sidebar content is the same layout as a closed one: no empty column.
  const showSidebar = sidebarOpen && sidebar != null;
  // D142: sliding needs a column to slide; with no content it is the instant frame.
  const slide = sidebarMotion === "slide" && sidebar != null;
  const cls = [styles.appShell, slide && styles.slide, !showSidebar && styles.sidebarClosed, className]
    .filter(Boolean)
    .join(" ");
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const onFocusReturnRef = useLatestRef(onFocusReturn);

  // D142: a sidebar that closes around focus hands it on, in both modes, before
  // it is hidden; otherwise the browser drops it to <body>. First choice is the
  // toggle that names the sidebar with aria-controls (D88 asks for one), else
  // main, the skip link's target. Content that goes away (sidebar to null)
  // removes the focused node before any effect runs, as in D136; not handled.
  // D147: `onFocusReturn` sees the move.
  useLayoutEffect(() => {
    if (showSidebar) return;
    const aside = sidebarRef.current;
    const doc = aside?.ownerDocument;
    // D147: hand back only from a sidebar that still holds focus.
    if (!aside || !doc || !isFocusLost(aside, { includeNowhere: false })) return;
    const toggle = [...doc.querySelectorAll<HTMLElement>("[aria-controls]")].find(
      (el) =>
        !aside.contains(el) &&
        (el.getAttribute("aria-controls") ?? "").split(/\s+/).includes(sidebarId) &&
        !el.matches(":disabled"),
    );
    handBackFocus({
      departing: aside,
      includeNowhere: false,
      candidates: [toggle, mainRef.current],
      reason: "sidebar-close",
      onFocusReturn: onFocusReturnRef.current,
    });
  }, [showSidebar, sidebarId, onFocusReturnRef]);
  // The rounded corner needs both a header and a sidebar beside it (D110).
  const mainCls = [styles.main, (!showSidebar || header == null) && styles.mainSquare].filter(Boolean).join(" ");
  return (
    <div ref={ref} className={cls} {...rest}>
      {skipLink}
      {header != null && <div className={styles.header}>{header}</div>}
      <div
        ref={sidebarRef}
        id={sidebarId}
        className={styles.sidebar}
        hidden={slide ? undefined : !showSidebar}
        data-psi-theme={sidebarTheme}
      >
        {slide ? <div className={styles.sidebarInner}>{sidebar}</div> : sidebar}
      </div>
      <main ref={mainRef} id={mainId} className={mainCls} tabIndex={-1}>
        {banner != null && <div className={styles.banner}>{banner}</div>}
        {children}
      </main>
    </div>
  );
}
