import { Button } from "@handamade/react";

import { STORYBOOK_BASE } from "../lib/storybook";
import { THEMES, type ThemeName } from "../theme";

const NAV = [
  ["Principles", "#principles"],
  ["Components", "#components"],
  ["Theming", "#theming"],
  ["Pipeline", "#pipeline"],
  ["Updates", "#updates"],
  ["Storybook", STORYBOOK_BASE],
] as const;

export function Header({
  theme,
  onTheme,
}: {
  theme: ThemeName;
  onTheme: (theme: ThemeName) => void;
}) {
  return (
    <header className="site-header">
      <div className="container">
        <a className="wordmark" href="#top" aria-label="DS — back to top">
          <span className="wordmark-mark" aria-hidden="true">
            ds
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
        <div
          className="theme-switch"
          role="group"
          aria-label="Theme (sets data-ds-theme)"
        >
          {THEMES.map((name) => (
            <Button
              key={name}
              size={24}
              variant={name === theme ? "accent-subtle" : "ghost"}
              aria-pressed={name === theme}
              onClick={() => onTheme(name)}
            >
              {name}
            </Button>
          ))}
        </div>
      </div>
    </header>
  );
}
