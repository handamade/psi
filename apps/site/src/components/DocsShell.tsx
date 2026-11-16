import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import {
  AppShell,
  IconButton,
  IconMenu,
  SkipLink,
  ToastProvider,
  useToast,
} from "@handamade/psi-react";

import type { NavSection } from "../content/docs-nav";
import { ANNOUNCE_EVENT } from "../lib/announce";
import { Header } from "../sections/Header";
import { useMode } from "../theme";
import { DocsNav } from "./DocsNav";

/** `md` from guidance.json layout.breakpoints; docs.css bakes the same 960px. */
const WIDE = "(min-width: 960px)";

function AnnounceBridge() {
  const toast = useToast();
  useEffect(() => {
    const onAnnounce = (e: Event) => toast.announce((e as CustomEvent<string>).detail);
    window.addEventListener(ANNOUNCE_EVENT, onAnnounce);
    return () => window.removeEventListener(ANNOUNCE_EVENT, onAnnounce);
  }, [toast]);
  return null;
}

export function DocsShell({
  nav,
  currentPath,
  children,
}: {
  nav: NavSection[];
  currentPath: string;
  children: ReactNode;
}) {
  const [mode, setMode] = useMode();
  // AppShell is a desktop frame with no drawer of its own: a closed sidebar
  // is `hidden`. So the sidebar starts open (server HTML, no-JS, desktop) and
  // collapses before paint on a narrow viewport; the toggle only shows there.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useLayoutEffect(() => {
    const query = window.matchMedia(WIDE);
    const sync = () => setSidebarOpen(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const extras = (
    <span className="docs-menu-toggle">
      <IconButton
        size={24}
        variant="ghost"
        aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={sidebarOpen}
        aria-controls="docs-sidebar"
        onClick={() => setSidebarOpen((o) => !o)}
      >
        <IconMenu aria-hidden="true" />
      </IconButton>
    </span>
  );

  return (
    <ToastProvider placement="bottom-end">
      <AnnounceBridge />
      <AppShell
        skipLink={<SkipLink href="#main">Skip to content</SkipLink>}
        header={<Header mode={mode} onMode={setMode} extras={extras} />}
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
