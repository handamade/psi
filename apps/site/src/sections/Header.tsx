import type { ReactNode } from "react";
import { Button } from "@handamade/psi-react";

import { STORYBOOK_BASE } from "../lib/storybook";
import { PsiMark } from "../PsiMark";
import type { Mode } from "../theme";

// Absolute, so the same header works on /docs/ pages: on the homepage a
// "/#x" link is still an in-page fragment navigation, with no reload.
const NAV = [
  ["Principles", "/#principles"],
  ["Components", "/#components"],
  ["Theming", "/#theming"],
  ["Pipeline", "/#pipeline"],
  ["Agents", "/#agents"],
  ["Roadmap", "/#roadmap"],
  ["Updates", "/#updates"],
  ["Storybook", STORYBOOK_BASE],
] as const;

export function Header({
  mode,
  onMode,
  extras,
}: {
  mode: Mode;
  onMode: (mode: Mode) => void;
  /** Docs-only controls (search, sidebar toggle). The homepage passes none. */
  extras?: ReactNode;
}) {
  const nextMode: Mode = mode === "dark" ? "light" : "dark";

  return (
    <header className="site-header">
      <div className="container">
        <a className="wordmark" href="/#top" aria-label="Psi — back to top">
          <PsiMark size={24} />
          <span className="wordmark-mark" aria-hidden="true">
            psi
          </span>
          <span className="wordmark-sub">design system</span>
        </a>
        <nav className="site-nav" aria-label="Sections">
          {NAV.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        {/* .site-nav hides below 960px; the Docs link lives here so it never does. */}
        <div className="theme-switch">
          {extras}
          <Button size={24} variant="neutral-subtle" href="/docs/">
            Docs
          </Button>
          <Button
            size={24}
            variant="neutral-subtle"
            aria-label={`Switch to ${nextMode} mode`}
            onClick={() => onMode(nextMode)}
          >
            {nextMode}
          </Button>
        </div>
      </div>
    </header>
  );
}
