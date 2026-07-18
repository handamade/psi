# @handamade/psi-mcp

MCP server and agent-context generator for the Psi (Ψ) design system. Documents the system — the 11 React 19 components, every semantic token with its OKLCH derivation formula resolved across all four themes, and the usage guidance — through two read-only tools. It does not write code.

## Connect

- **Hosted (no install):** Streamable HTTP at `https://psi.kurkin.de/mcp`
- **Local (stdio):** `npx @handamade/psi-mcp`

Tools: `search(query)` → compact briefs with ids · `get(id)` → full detail (`component:Button`, `token:bgPrimary`, `topic:variants`, or a bare name).

## Generate agent context (D44)

    npx @handamade/psi-mcp init            # writes/updates AGENTS.md
    npx @handamade/psi-mcp init --claude   # also CLAUDE.md

Content is generated from the same baked index as the MCP tools, inside `<!-- psi:agents:start/end -->` markers — re-run after upgrades; edits outside the markers are preserved.

## How it stays honest

The index is baked at publish time from the sibling packages' generated artifacts (`manifest.json`, `guidance.json`, `resolved/<theme>.json`, per-component docs) and versioned in lockstep with them — the server never answers from prose.
