const METHODS = [
  {
    name: "Hosted MCP",
    snippet: "https://psi.kurkin.de/mcp",
    note: "Streamable HTTP — point any MCP client at it, nothing to install",
  },
  {
    name: "Local MCP",
    snippet: "npx @handamade/psi-mcp",
    note: "stdio server for Claude Code, Cursor, and friends",
  },
  {
    name: "Agent context",
    snippet: "npx @handamade/psi-mcp init --claude",
    note: "generates AGENTS.md + CLAUDE.md from the published index — re-run to upgrade",
  },
];

export function AgentReady() {
  return (
    <section className="section" id="agents">
      <div className="container">
        <div className="section-head">
          <span className="annot annot--accent">05 · Agents</span>
          <h2>Two tools, zero hallucinated props.</h2>
          <p className="lede">
            Search and get answers from the same generated artifacts the
            build gates on — every prop union, every token formula, every
            theme value.
          </p>
        </div>
        <div className="theme-grid">
          {METHODS.map((m) => (
            <div className="card" key={m.name}>
              <span className="annot annot--accent">{m.name}</span>
              <p style={{ margin: "var(--psi-space-16) 0 var(--psi-space-8)" }}>
                <code>{m.snippet}</code>
              </p>
              <p style={{ color: "var(--psi-fg-secondary)" }}>{m.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
