import { REPO_URL, STORYBOOK_BASE, storybookDocs } from "../lib/storybook";

const QUICK_START = `pnpm install
pnpm build     # tokens + components + docs
pnpm dev       # tokens watcher + storybook`;

const USAGE = `import { Button } from "@dku/react";
import "@dku/react/styles";
import "@dku/tokens/base.css";
import "@dku/tokens/light.css";
import "@dku/tokens/components.css";

<html data-ds-theme="light">`;

export function Footer() {
  return (
    <footer className="site-footer" id="start">
      <div className="container">
        <div className="footer-grid">
          <div className="code-block">
            <div className="code-block-head">
              <span className="annot">Quick start</span>
            </div>
            <pre>{QUICK_START}</pre>
          </div>
          <div className="code-block">
            <div className="code-block-head">
              <span className="annot">Use it in an app</span>
            </div>
            <pre>{USAGE}</pre>
          </div>
        </div>
        <nav className="footer-links" aria-label="Project links">
          <a href={STORYBOOK_BASE}>Storybook</a>
          <a href={storybookDocs("Welcome")}>Getting started</a>
          <a href={storybookDocs("Tokens and Assets/Color Tokens")}>
            Token reference
          </a>
          <a href={REPO_URL}>GitHub</a>
        </nav>
        <div className="footer-note">
          <span className="annot">
            DS · @dku — docs in packages/*/README.md and the design spec
          </span>
          <span className="annot">
            Built with DS itself (apps/promo) — flip the theme and watch every
            color re-derive.
          </span>
        </div>
      </div>
    </footer>
  );
}
