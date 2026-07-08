const FIGMA_VARS = [
  { name: "bg/primary", varClass: "--ds-bg-primary", note: "COLOR · 3 modes" },
  { name: "fg/accent", varClass: "--ds-fg-accent", note: "COLOR · 3 modes" },
  { name: "space/16", varClass: "--ds-fill-neutral3", note: "FLOAT · 16" },
  { name: "radius/8", varClass: "--ds-fill-neutral4", note: "FLOAT · 8" },
];

const ARTIFACTS = [
  {
    file: "llms.txt",
    note: "authoring rules and package map, written for models",
  },
  {
    file: "manifest.json",
    note: "every component, prop, variant and default — machine-readable",
  },
  {
    file: "guidance.json",
    note: "variant intent, usage rules, state derivation, type defaults",
  },
  {
    file: "dtcg/*.json",
    note: "W3C Design Tokens export for any external tool",
  },
];

export function Pipeline() {
  return (
    <section className="section" id="pipeline">
      <div className="container">
        <div className="section-head">
          <span className="annot annot--accent">04 · Pipeline</span>
          <h2>Code is the source of truth. Everything else is a projection.</h2>
          <p className="lede">
            One resolver feeds CSS, Figma, docs and tests — so design and code
            can&apos;t drift.
          </p>
        </div>

        <div className="pipeline-grid">
          <div className="card">
            <h3 style={{ font: "var(--ds-text-20-28-semibold)" }}>
              Figma, synced from code
            </h3>
            <p>
              The in-repo <strong>DS Token Sync</strong> plugin upserts a
              variable collection into Figma: one mode per theme, colors
              grouped bg/fg/fill/border, floats for space, size and radius,
              text styles for every type combo. Idempotent, with a dry-run
              diff and orphan reporting — each variable even carries its
              derivation formula in the description.
            </p>
            <div className="var-list" aria-label="Synced Figma variables (illustration)">
              {FIGMA_VARS.map((row) => (
                <div className="var-row" key={row.name}>
                  <span
                    className="dot"
                    style={{ background: `var(${row.varClass})` }}
                    aria-hidden="true"
                  />
                  <span>{row.name}</span>
                  <span className="val">{row.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ font: "var(--ds-text-20-28-semibold)" }}>
              Readable by your AI, too
            </h3>
            <p>
              The system ships its own context. Point an agent at the package
              and it knows every token, prop and rule — no scraping, no
              guessing.
            </p>
            <div className="var-list" aria-label="AI-readable artifacts">
              {ARTIFACTS.map((artifact) => (
                <div className="var-row" key={artifact.file}>
                  <span className="annot annot--accent">{artifact.file}</span>
                  <span className="val">{artifact.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
