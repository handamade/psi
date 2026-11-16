import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  AppShell,
  Button,
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
import { SearchDialog } from "./SearchDialog";

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
  // The server HTML cannot know the viewport. docs.css hides the sidebar and
  // its toggle below 960px until this marker exists, so a narrow no-JS page
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

  const [searchOpen, setSearchOpen] = useState(false);
  // Ctrl+K is kill-line in a macOS text field, so Apple platforms get only
  // Meta+K. Unknown until mounted, so the server and first client render agree.
  const [apple, setApple] = useState(false);
  useLayoutEffect(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    setApple(/Mac|iPhone|iPad|iPod/i.test(nav.userAgentData?.platform || nav.userAgent));
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((apple ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [apple]);

  const extras = (
    <>
      <Button
        size={24}
        variant="neutral-subtle"
        onClick={() => setSearchOpen(true)}
        aria-keyshortcuts={apple ? "Meta+K" : "Control+K"}
      >
        Search
      </Button>
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
    </>
  );

  return (
    <ToastProvider placement="bottom-end">
      <AnnounceBridge />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AppShell
        ref={shellRef}
        className="docs-shell"
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
