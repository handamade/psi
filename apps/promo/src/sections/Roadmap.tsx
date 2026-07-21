import { IconCheck, IconChevronRight, Panel } from "@handamade/psi-react";

const SHIPPED = [
  ["15 components, 22 icons", "Button, IconButton, Input, Select, Checkbox, Switch, Tag, Tooltip, Card, Panel, NavBar, Toolbar, AspectRatio, Field, Dialog"],
  ["4 themes", "light, dark and two customer brands (acme, ember) — plus `pnpm new-theme --base dark`"],
  ["Contrast gate", "WCAG AA validated per theme, at build time"],
  ["Visual regression", "Playwright screenshots per component, light + ember, gated in CI"],
  ["Figma sync", "Psi Token Sync plugin — code → Figma variables"],
  ["AI artifacts", "llms.txt, manifest.json, guidance.json, DTCG export"],
  ["@handamade/psi-mcp", "hosted + local MCP server, tokens, guidance and slot contracts as queryable tools for agents"],
  ["Slot contracts", "what nests where, authored per component and merged into the manifest — validated at build (D45)"],
  ["Token scopes", "which CSS properties a token may bind to — enforced at the token build (D46)"],
  ["Composition patterns", "parametrized recipes with clarifying questions agents ask before generating (D47), validated at build (D48)"],
  ["Surface family", "shared --psi-surface-* recipe; Panel primitive, Dialog rebinds on it (D51)"],
  ["Toolbar", "unblocks the filter-toolbar composition pattern (D52)"],
] as const;

const NEXT = [
  ["Custom listbox Select", "v1 ships a styled native <select>; a fully custom listbox is v2"],
  ["Tooltip on the Popover API", "native anchor positioning once support settles"],
] as const;

export function Roadmap() {
  return (
    <section className="section" id="roadmap">
      <div className="container">
        <div className="section-head">
          <span className="annot annot--accent">06 · Roadmap</span>
          <h2>Deliberately small. Honestly documented.</h2>
        </div>
        <div className="roadmap-grid">
          <Panel className="card">
            <h3 style={{ font: "var(--psi-text-20-28-semibold)", marginBottom: "var(--psi-space-20)" }}>
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
          </Panel>
          <Panel className="card">
            <h3 style={{ font: "var(--psi-text-20-28-semibold)", marginBottom: "var(--psi-space-20)" }}>
              Next
            </h3>
            <ul className="check-list">
              {NEXT.map(([title, detail]) => (
                <li key={title}>
                  <IconChevronRight size={16} aria-hidden="true" style={{ color: "var(--psi-fg-accent)" }} />
                  <span>
                    <strong>{title}</strong> — {detail}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <p className="annot roadmap-foot">
          The system stays deliberately small: layout, typography compositions
          and marketing-scale type belong to consuming apps. This page is one —
          every section here is plain markup over --psi-* tokens. View source.
        </p>
      </div>
    </section>
  );
}
