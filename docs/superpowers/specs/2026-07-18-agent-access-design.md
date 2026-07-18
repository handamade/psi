# Agent access release — 0.4.0 (D43–D44)

Date: 2026-07-18. Driven by the market comparison (`docs/research/2026-07-18-market-comparison.md`): Astryx made MCP access to a design system table stakes; Psi's machine-readable artifacts already exist but don't travel. Theme of the release: **expose what we already generate**. Components (Field/Label, Dialog) and theming work are explicitly deferred to 0.5+.

## Decisions

- **D43 — Ship MCP surfaces now; supersedes D25's deferral.** D25 deferred MCP to v2 because in-repo artifacts (llms.txt, manifest.json, guidance.json, resolved tokens) give repo-local agents ~90% of the value. That reasoning still holds for repo-local agents — but the market moved: out-of-repo discoverability is now the differentiator being compared (Astryx ships a CLI-as-MCP-server *and* a hosted docsite endpoint). Psi ships both transports over one core in a new package, `@handamade/psi-mcp`. The tool surface is deliberately minimal — two read-only tools, Astryx-pattern:
  - `search(query)` — keyword search over components, tokens, and guidance topics; returns compact briefs (name + one-liner + variant/size axes for components; name + role for tokens). Response budget ≤ ~1.5k tokens.
  - `get(id)` — full detail for one id: a component (props with literal unions and defaults from manifest.json, a11y/keyboard table from a11y-meta, doc excerpt), a token (derivation formula + resolved OKLCH/hex across all four themes), or a topic (`themes`, `variants`, `motion`, `getting-started`, sourced from guidance.json + llms.txt).
  - No write/generate/scaffold tools. Psi's MCP documents the system; it does not write code.
- **D44 — Agent-context files are generated, not hand-written.** `npx @handamade/psi-mcp init` writes an `AGENTS.md` (plus `--claude` for a CLAUDE.md section) into the consumer's repo, generated from the same bundled index as the MCP tools, so consumer-facing agent context cannot drift from the published package version. Re-running after an upgrade updates in place via a marker-delimited block (`<!-- psi:agents:start -->` … `<!-- psi:agents:end -->`), preserving surrounding user content. Generated content: house rules (px sizes, flat variants, one-accent rule with Tag exemption per D40, the four required CSS imports including utilities.css, `data-psi-theme`), component index with prop unions, MCP connection snippet (both transports).

## Architecture

### Package: `@handamade/psi-mcp`

New workspace package, versioned in lockstep with tokens/react (see Release mechanics).

- **Bundled index, baked at publish.** A build step (`scripts/build-index.ts`) ingests the sibling packages' generated artifacts — `packages/react/dist/manifest.json`, `packages/tokens/dist/guidance.json`, `dist/resolved/{light,dark,acme,ember}.json`, DTCG, per-component `docs/*.md`, a11y-meta — into one JSON index shipped inside the package. The server has **no runtime dependency** on the consumer having psi-tokens/psi-react installed, and lockstep versioning guarantees the index matches the release it ships with.
- **Core modules:** `index-builder` (artifact ingestion + keyword index), `store` (query API: search, getComponent, getToken, getTopic), `tools` (MCP tool definitions binding store to the two tools).
- **Transports** (both via the official `@modelcontextprotocol/sdk`):
  - stdio: `bin` entry → `npx @handamade/psi-mcp` for Claude Code / Cursor / any stdio MCP client.
  - Streamable HTTP: exported stateless per-request handler, consumed by the hosted endpoint.
- **Init command:** `npx @handamade/psi-mcp init [--claude]`, per D44. Idempotent — creates the file if absent, updates only its marker block if present.

### Hosted endpoint: `psi.kurkin.de/mcp`

One Vercel function at `api/mcp.ts` (repo root) wrapping the exported HTTP handler. Deployed by the existing merge-to-main pipeline alongside the static site (`assemble-site.mjs` output untouched); the site remains static except this route. Stateless — no sessions, no storage, no auth for read-only documentation tools.

### v0 Design Systems 2.0 validation (non-blocking)

`v0.json` authored in-repo per v0's schema (GitHub source mount, env/none, starter notes covering the four CSS imports + theme attribute). Import run during release week on a paid v0 plan; findings recorded in `docs/research/`. Explicitly **not** a release gate — an external SaaS cannot block 0.4.0.

## Testing

- **Index-builder against real sibling `dist`** (not fixtures) — doubles as an artifact-shape regression gate: if tokens/react change their generated formats, psi-mcp's build fails in CI.
- **Store/tools unit tests:** search relevance basics, brief size budget, `get` completeness for each id kind (component / token / topic), unknown-id behavior.
- **Transport round-trips:** initialize → tools/list → tools/call for both stdio and HTTP handler.
- **Init snapshot test:** generated AGENTS.md snapshot + idempotency (run twice → identical file; run against a file with surrounding user content → content preserved).
- CI matrix otherwise unchanged; `check-docs-drift.mjs` extended to verify the new package's component count matches manifest.json. No VR impact.

## Docs & marketing

- llms.txt (root + both packages) gains the MCP trail: how to connect (hosted URL + npx command), what the two tools return.
- READMEs: MCP section in root + psi-mcp README.
- Promo site: "Agent-ready" section showing both connection methods; the build-time WCAG AA gate stays the headline (uncontested differentiator per the market report — Astryx has no contrast enforcement).

## Release mechanics

- Changesets: one minor changeset; tokens, react, and the new psi-mcp all land at **0.4.0** (lockstep is what makes the baked index sound).
- `pnpm release` flow unchanged (release-guard → build → publish → tag); psi-mcp added to the publish set, `access public`.

## Out of scope (earmarked)

- **0.5:** Field/Label and Dialog components (eval-blocking gaps from the market report).
- **Later:** per-brand light+dark pairs (D27 revisit), seed-derived theme scaffolding (`new-theme --from-accent`), Tokens Studio export (D24 already covers interop via DTCG).
