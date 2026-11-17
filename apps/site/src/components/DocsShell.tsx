import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AppShell, SkipLink, ToastProvider } from "@handamade/psi-react";

import type { NavSection } from "../content/docs-nav";
import { SiteChrome } from "../chrome/SiteChrome";
import { WIDE } from "../chrome/useWide";
import { AnnounceBridge } from "./AnnounceBridge";
import { DocsNav } from "./DocsNav";

export function DocsShell({
  nav,
  currentPath,
  children,
}: {
  nav: NavSection[];
  currentPath: string;
  children: ReactNode;
}) {
  // AppShell is a desktop frame with no drawer of its own: a closed sidebar
  // is `hidden`. So the sidebar starts open (server HTML, no-JS, desktop) and
  // collapses before paint on a narrow viewport; the Menu drawer brings it back.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // The server HTML cannot know the viewport. docs.css hides the sidebar and
  // its Menu toggle below 960px until this marker exists, so a narrow no-JS page
  // (and the frame before hydration) is one column, not 16rem of dead sidebar.
  // An attribute, not a class: AppShell rewrites its className on every toggle.
  const shellRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    shellRef.current?.setAttribute("data-hydrated", "");
    const query = window.matchMedia(WIDE);
    const sync = () => setSidebarOpen(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <ToastProvider placement="bottom-end">
      <AnnounceBridge />
      <AppShell
        ref={shellRef}
        className="docs-shell"
        skipLink={<SkipLink href="#main">Skip to content</SkipLink>}
        header={<SiteChrome sidebar={{ open: sidebarOpen, onToggle: () => setSidebarOpen((o) => !o), id: "docs-sidebar" }} />}
        sidebar={<DocsNav nav={nav} currentPath={currentPath} />}
        sidebarId="docs-sidebar"
        sidebarOpen={sidebarOpen}
        mainId="main"
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
