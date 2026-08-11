import { Button } from "@handamade/psi-react";

import { STORYBOOK_BASE } from "../lib/storybook";
import { PsiMark } from "../PsiMark";
import type { Mode } from "../theme";

const NAV = [
  ["Principles", "#principles"],
  ["Components", "#components"],
  ["Theming", "#theming"],
  ["Pipeline", "#pipeline"],
  ["Agents", "#agents"],
  ["Roadmap", "#roadmap"],
  ["Updates", "#updates"],
  ["Storybook", STORYBOOK_BASE],
] as const;

export function Header({
  mode,
  onMode,
}: {
  mode: Mode;
  onMode: (mode: Mode) => void;
}) {
  const nextMode: Mode = mode === "dark" ? "light" : "dark";

  return (
    <header className="site-header">
      <div className="container">
        <a className="wordmark" href="#top" aria-label="Psi — back to top">
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
        <div className="theme-switch">
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
