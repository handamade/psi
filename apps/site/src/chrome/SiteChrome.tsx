import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, Dialog, IconMenu, Link, SegmentedControl, Segment } from "@handamade/psi-react";

import { releaseVersion } from "virtual:psi-facts";

import { SearchDialog } from "../components/SearchDialog";
import { REPO_URL, STORYBOOK_BASE } from "../lib/storybook";
import { PsiMark } from "../PsiMark";
import { useModePref, type ModePref } from "../theme";

const PAGES = [
  ["Docs", "/docs/"],
  ["Components", "/docs/components/"],
] as const;

const MORE = [
  ["Storybook", STORYBOOK_BASE],
  [`Changelog (v${releaseVersion})`, "/docs/changelog/"],
  ["MCP", "/docs/get-started/ai/"],
  ["llms.txt", "/llms.txt"],
  ["GitHub", REPO_URL],
] as const;

function ModeControl({ pref, onPref, fill }: { pref: ModePref; onPref: (p: ModePref) => void; fill?: boolean }) {
  return (
    <SegmentedControl aria-label="Colour mode" size={24} value={pref} onValueChange={(v) => onPref(v as ModePref)} fill={fill}>
      <Segment value="light">Light</Segment>
      <Segment value="dark">Dark</Segment>
      <Segment value="system">System</Segment>
    </SegmentedControl>
  );
}

export function SiteChrome({ sidebar }: { sidebar?: { open: boolean; onToggle: () => void; id: string } } = {}) {
  // `shown`, not the stored preference: a derived brand can paint its own mode
  // over an explicit one, and the control must say what the page is.
  const [, , setPref, , shown] = useModePref();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Ctrl+K is kill-line in a macOS text field, so Apple platforms get Meta+K
  // only. Unknown until mounted, so the server and first client render agree.
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

  const closeMenu = () => {
    setMenuOpen(false);
    menuButton.current?.focus();
  };

  return (
    <>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Psi, home">
          <PsiMark size={24} />
          <span aria-hidden="true">psi</span>
        </a>
        <nav className="site-nav" aria-label="Site">
          {PAGES.map(([label, href]) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </nav>
        <span className="site-header-space" />
        <Button size={24} variant="neutral-subtle" onClick={() => setSearchOpen(true)} aria-keyshortcuts={apple ? "Meta+K" : "Control+K"}>
          Search
        </Button>
        <span className="site-header-mode">
          <ModeControl pref={shown} onPref={setPref} />
        </span>
      </header>

      <nav className="site-bottom-bar" aria-label="Site, bottom">
        {PAGES.map(([label, href]) => (
          <a key={href} href={href}>{label}</a>
        ))}
        <button ref={menuButton} type="button" aria-expanded={menuOpen} aria-controls="site-menu" onClick={() => setMenuOpen(true)}>
          <IconMenu size={16} aria-hidden="true" />
          Menu
        </button>
      </nav>

      <Dialog id="site-menu" open={menuOpen} onClose={closeMenu} placement="inline-end" width={400} title="Menu">
        {sidebar && (
          <Button variant="neutral" size={40} aria-controls={sidebar.id} aria-expanded={sidebar.open}
            onClick={() => { sidebar.onToggle(); closeMenu(); }}>
            {sidebar.open ? "Close navigation" : "Open navigation"}
          </Button>
        )}
        <p className="site-menu-label">Appearance</p>
        <ModeControl pref={shown} onPref={setPref} fill />
        <p className="site-menu-label">More</p>
        <ul className="site-menu-links">
          {MORE.map(([label, href]) => (
            <li key={label}><Link href={href}>{label}</Link></li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
