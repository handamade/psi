import { Button, IconCheck, Switch, Tag } from "@handamade/react";

import type { ThemeName } from "../theme";

const ACME_SNIPPET = `export const acmePalette: Palette = {
  charcoal: { l: 0.22, c: 0.015, h: 30 },
  cream:    { l: 0.96, c: 0.01,  h: 80 },
  coral:    { l: 0.55, c: 0.2,   h: 30 },
  mint:     { l: 0.52, c: 0.15,  h: 160 },
  gold:     { l: 0.78, c: 0.15,  h: 85 },
  crimson:  { l: 0.55, c: 0.22,  h: 15 },
};

export const acmeSlots: SlotMap = {
  ink: "charcoal",   canvas: "cream",
  accent: "coral",   success: "mint",
  warning: "gold",   danger: "crimson",
};`;

function ThemePreview({ name }: { name: ThemeName }) {
  return (
    <figure className="theme-card">
      <div className="theme-card-ui" data-ds-theme={name}>
        <header>
          <strong>Invoices</strong>
          <Tag variant="success" subtle>
            Paid
          </Tag>
        </header>
        <p>Q3 retainer — Acme Corp. Due in 14 days.</p>
        <div className="row">
          <Switch defaultChecked>Auto-remind</Switch>
          <Button variant="accent">New invoice</Button>
        </div>
      </div>
      <figcaption className="annot">data-ds-theme=&quot;{name}&quot;</figcaption>
    </figure>
  );
}

export function Theming() {
  return (
    <section className="section" id="theming">
      <div className="container">
        <div className="section-head">
          <span className="annot annot--accent">03 · Theming</span>
          <h2>A customer is a theme file, not a fork.</h2>
          <p className="lede">
            The same markup, rendered three times below — each card just sets
            its own <code>data-ds-theme</code>. Semantic token names never
            change, so consuming code is theme-agnostic.
          </p>
        </div>

        <div className="theme-grid">
          <ThemePreview name="light" />
          <ThemePreview name="dark" />
          <ThemePreview name="acme" />
        </div>

        <div className="theming-cols">
          <div className="code-block">
            <div className="code-block-head">
              <span className="annot">
                themes/customers/acme.ts · scaffolded by `pnpm new-theme acme`
              </span>
            </div>
            <pre>{ACME_SNIPPET}</pre>
          </div>
          <ul className="check-list">
            <li>
              <IconCheck size={16} aria-hidden="true" />
              <span>
                <strong>Six OKLCH anchors + six slots</strong> — that is the
                entire cost of onboarding a customer brand.
              </span>
            </li>
            <li>
              <IconCheck size={16} aria-hidden="true" />
              <span>
                <strong>WCAG AA is a build gate, not a guideline.</strong> A
                theme that fails the contrast matrix fails the build.
              </span>
            </li>
            <li>
              <IconCheck size={16} aria-hidden="true" />
              <span>
                <strong>Themes are attribute-scoped</strong> — nest{" "}
                <code>data-ds-theme</code> anywhere for per-surface theming,
                like the three cards above.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
