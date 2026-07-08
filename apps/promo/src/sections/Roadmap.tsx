import { IconCheck, IconChevronRight } from "@dku/react";

const SHIPPED = [
  ["8 atoms, 16 icons", "Button, IconButton, Input, Select, Checkbox, Switch, Tag, Tooltip"],
  ["3 themes", "light, dark and an example customer brand — plus `pnpm new-theme`"],
  ["Contrast gate", "WCAG AA validated per theme, at build time"],
  ["Figma sync", "DS Token Sync plugin — code → Figma variables"],
  ["AI artifacts", "llms.txt, manifest.json, guidance.json, DTCG export"],
] as const;

const NEXT = [
  ["Custom listbox Select", "v1 ships a styled native <select>; a fully custom listbox is v2"],
  ["Tooltip on the Popover API", "native anchor positioning once support settles"],
  ["@dku/mcp", "tokens and guidance as queryable tools for agents"],
  ["Visual regression", "screenshot testing across all themes"],
] as const;

export function Roadmap() {
  return (
    <section className="section" id="roadmap">
      <div className="container">
        <div className="section-head">
          <span className="annot annot--accent">05 · Roadmap</span>
          <h2>Deliberately small. Honestly documented.</h2>
        </div>
        <div className="roadmap-grid">
          <div className="card">
            <h3 style={{ font: "var(--ds-text-20-28-semibold)", marginBottom: "var(--ds-space-20)" }}>
              In v1 today
            </h3>
            <ul className="check-list">
              {SHIPPED.map(([title, detail]) => (
                <li key={title}>
                  <IconCheck size={16} aria-hidden="true" />
                  <span>
                    <strong>{title}</strong> — {detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3 style={{ font: "var(--ds-text-20-28-semibold)", marginBottom: "var(--ds-space-20)" }}>
              Next
            </h3>
            <ul className="check-list">
              {NEXT.map(([title, detail]) => (
                <li key={title}>
                  <IconChevronRight size={16} aria-hidden="true" style={{ color: "var(--ds-fg-accent)" }} />
                  <span>
                    <strong>{title}</strong> — {detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="annot roadmap-foot">
          v1 stops at atoms on purpose: layout, typography compositions and
          marketing-scale type belong to consuming apps. This page is one —
          every section here is plain markup over --ds-* tokens. View source.
        </p>
      </div>
    </section>
  );
}
