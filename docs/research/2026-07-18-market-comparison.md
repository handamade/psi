# Market comparison: Psi vs v0 Design Systems 2.0, Astryx, Spektral

Date: 2026-07-18 · Prepared ahead of the next Psi cycle. Sources: vendor docs/sites, GitHub source, press coverage; Psi facts from the repo at this date (v0.2.0, post-D42 rename, changeset unreleased).

## TL;DR

Of the three, only **Astryx (Meta)** is a direct competitor — an open-source React design system with ~100+ components and a serious agent-tooling story. **v0 Design Systems 2.0** is not a design system at all but an AI-ingestion layer for *someone else's* system (a potential distribution channel for Psi, not a rival). **Spektral** is a waitlist-only spec-first *generator* of design systems with a distinctive governance model but a conventional token architecture.

Psi's defensible edges: the **build-time WCAG AA contrast gate** (none of the three has one), the **OKLCH formula DSL** (vs hex or HCT expansion), naming discipline (pixel-true sizes, flat variants), and the deepest per-artifact machine-readable trail (llms.txt + manifest + guidance + resolved/DTCG tokens). Psi's real gaps against the market: **component breadth** (11 vs Astryx's ~100+), **no MCP server** (deferred in D25 — Astryx just made this table stakes), **npm not publicly published**, and no per-brand light+dark pairs.

---

## Brief summaries

### 1. v0 Design Systems 2.0 (Vercel) — v0.app/docs/design-systems-2

**What it is:** A v0 capability (launched ~Dec 2025) that ingests an existing design system — npm packages, GitHub repos, Storybook, Figma frames — into a team-scoped "skill" so v0-generated apps use your real components and tokens instead of the default shadcn starter. Configured via `v0.json`; a human-reviewed generated "starter app" becomes the seed for every future generation. Proven against Fluent, Polaris, Carbon, Blueprint, Geist.

**Not a design system.** It ships no components, tokens, or a11y rules; everything is inherited from the imported system. Its grounding rule ("if a component, prop, or token cannot be verified from the sources, don't use it") rewards systems with clean, verifiable artifacts.

- **Token/color model:** none of its own; dark mode, semantics all inherited.
- **Accessibility:** nothing — fully delegated to the imported system.
- **Agent story:** the product *is* the agent layer, but the saved skill is an opaque instruction bundle — no llms.txt, manifest, or token export.
- **Distribution:** proprietary SaaS; DS features gated to paid team plans; credit-based pricing (a recurring complaint in reviews).

**Relevance to Psi:** a consumption channel, not a competitor. Psi's manifest.json + resolved token JSON + guidance.json are exactly the "verifiable sources" v0 grounds on — importing Psi into v0 would be a cheap, high-signal compatibility test.

### 2. Astryx (Meta) — astryx.atmeta.com

**What it is:** Meta's open-source (MIT) React design system, publicly launched ~June 2026, beta (~v0.1.x). Externalization of an ~8-year internal system claimed to power 13,000+ internal apps. Tagline: "fully customizable and agent ready." ~100+ components in 12 categories (marketing says 150+), including a dedicated **Chat/AI-app category** (Chat Composer, Chat Tool Calls, Command Palette), StyleX styling with dual distribution (prebuilt CSS or source compilation), themes as npm packages.

- **Tokens/color:** semantic CSS custom properties via cascade layers; **hex-authored with HCT (Material-You-style) tonal expansion** — a whole theme derives from one seed accent with warmth/contrast knobs. Dark mode via CSS `light-dark()` tuples; theme inheritance via `defineTheme({extends})`.
- **Variants/sizes:** the conventions Psi deliberately avoids — `primary | secondary | ghost | destructive` and `sm | md | lg` (with a SizeContext inheritance mechanism, and variant extensibility via TS module augmentation — both genuinely nice ideas).
- **Accessibility:** strong recent ARIA/keyboard investment (APG patterns, roving focus, typeahead hooks, required `label` prop on Button); `prefers-reduced-motion` respected. **But: no published WCAG guarantee and no automated contrast enforcement** — contrast is hand-tuned per theme (code comments claim AA for badge values), and there's no accessibility docs page yet.
- **Agent readiness (their flagship):** self-describing CLI JSON manifest; **two MCP surfaces** (CLI-as-MCP-server + hosted Streamable-HTTP endpoint with `search`/`get` tools); `npx astryx init --features agents` generates CLAUDE.md/.cursorrules/AGENTS.md with behavioral rules. No llms.txt (404) — their bet is CLI/MCP instead.
- **Figma:** none at all. Code-first with no design-tool workflow.
- **Risks:** beta API churn, unproven external adoption, StyleX learning curve, own materials inconsistent on theme/component counts.

### 3. Spektral — spektral.design

**What it is:** A **spec-first design-system generation platform** in closed early access (waitlist; no pricing, no public code, zero third-party coverage yet). An Electron desktop app + AI agent: plain-English intent (or Figma import via MCP) → framework-agnostic YAML specs → generated React components, DTCG tokens, Storybook stories, docs, and axe-core audits, written into your repo. Positions explicitly against terminal coding agents; workflow is Intent → Spec → Generate → Audit → Conform.

- **Tokens/color:** three-layer DTCG JSON (primitive → semantic → component) built with Style Dictionary; **plain hex, no perceptual color model, no documented dark mode** (multi-brand only, via parallel token directories).
- **Components:** none shipped — generated per customer. Examples use `primary/secondary` variants and `sm/md/lg` sizes. React today; Vue/Lit/Svelte promised.
- **Accessibility:** axe-core runs against rendered Storybook stories and the agent self-fixes violations — **contrast enforced post-hoc at audit time, not gated at build**. Keyboard behavior is first-class in the spec schema. No reduced-motion story found.
- **Governance (the distinctive part):** per-platform conformance matrix against a spec hash (`synced/stale/deviated/failing`), documented deviations with reason and approval status, and "work orders" — persistent audit logs of every human/AI exchange including provider+model, linkable to Jira/Linear. Aimed at enterprise compliance.
- **Risks:** pre-launch and unvalidated; plugin security is weak (plaintext config incl. passwords); generated-per-team components mean no battle-tested shared implementation.

---

## Comparison matrix

| Dimension | **Psi** | Astryx | Spektral | v0 DS 2.0 |
|---|---|---|---|---|
| Category | Design system (React + tokens) | Design system (React) | DS generator (agent) | DS ingestion for codegen |
| Maturity | v0.2.0, live site, self-used | Beta ~0.1.x, 8y internal, 9.1k★ | Waitlist, pre-launch | Shipped SaaS feature |
| Color model | **OKLCH formula DSL** | Hex + HCT expansion | Hex | N/A (inherited) |
| Contrast guarantee | **Build-time WCAG AA gate (throws)** | Hand-tuned, no gate | Post-hoc axe audit + self-fix | None |
| Dark mode | light/dark themes; 1 base per brand | `light-dark()` tuples, per-theme | Not documented | Inherited |
| Theming | Palette anchors + slots + formulas; 4 themes | Seed-color → whole theme (HCT); themes as npm pkgs | Parallel token dirs per brand | Inherited |
| Components | 11 + 22 icons | ~100+ (incl. chat/AI category) | Generated on demand | None |
| Variants / sizes | Flat 8 variants; px sizes 24/32/40/48 | primary/secondary…; sm/md/lg | primary/secondary…; sm/md/lg | Inherited |
| Reduced motion | Global zeroing in utilities.css, lint-enforced | Respected (tokens + release notes) | Not found | Inherited |
| Machine-readable docs | **llms.txt trail, manifest.json, guidance.json, resolved+DTCG JSON, generated per-component docs, drift gate in CI** | CLI JSON manifest, generated agent context files; no llms.txt | Specs YAML (producer-side only) | Opaque "skill" bundle |
| MCP | Deferred to v2 (D25) | **Two MCP surfaces** | Headless MCP (generate/iterate/debug) | Legacy template only |
| Figma | One-way code→Figma plugin | None | Figma→spec import | Figma-in as reference |
| Testing/CI | 236 tests, axe suite, 152 VR baselines, contrast+drift gates | Present (scale unknown), codemods | Generated stories + axe loop | N/A |
| Distribution | npm wired, **not yet public** | npm, MIT, free | Proprietary, waitlist | Paid SaaS |

---

## Where Psi is ahead

1. **Accessibility as a build gate, not a promise.** Psi is the only one of the four where contrast failure *breaks the build* (alpha-composited pairs, gamut gate D39, `fgOnAccent` escape hatch D37). Astryx hand-tunes; Spektral audit-and-rewrites after generation; v0 has nothing. This is the single clearest differentiator — worth putting front and center on the promo site.
2. **Perceptual, formula-based tokens.** OKLCH formulas with slots/refs/validation are structurally richer than Astryx's hex-plus-HCT-expansion and Spektral's static hex DTCG. Re-theming by swapping ~8 anchors while the AA gate re-verifies everything is a story none of them can tell.
3. **Naming discipline.** Pixel-true scales and flat variants vs the market-default `primary/secondary` + `sm/md/lg` (both Astryx and Spektral use the latter). Psi's convention is objectively less ambiguous for both humans and agents — and v0's "grounding" behavior rewards exactly this kind of unambiguous API.
4. **Depth of the machine-readable trail.** manifest.json with literal prop unions, guidance.json with intent/states/recipes, resolved tokens carrying their derivation formulas, DTCG export, and a CI drift gate keeping prose honest. Astryx's CLI manifest describes its *CLI*; Psi's artifacts describe the *system itself*. (Astryx's hosted MCP is the delivery mechanism we lack, not better content.)
5. **Verification rigor relative to size.** Contrast gate + docs-drift gate + axe suite + 152 self-hosted VR baselines in CI, at a 2-package scale. Astryx is churning breaking changes in beta; Spektral has no external validation at all.
6. **A Figma story at all.** One-way code→Figma sync (D18) beats Astryx's nothing; only Spektral goes the other direction (Figma-in).

## Where Psi needs to improve (prioritized)

1. **Ship distribution — publish to npm publicly.** Everything else is moot while the packages sit on a private registry at 0.2.0 with the D42 rename changeset unreleased. Astryx is `npm install` away with MIT; Psi currently can't be adopted by anyone. Release the rename, publish `@handamade/psi-tokens` / `@handamade/psi-react` publicly.
2. **Reconsider the D25 MCP deferral.** In June 2026 Astryx made MCP access to a design system table stakes, and press coverage centers on exactly that ("JSON manifest stops AI agents hallucinating UI props" — which is what manifest.json already does, unexposed). Psi's artifacts already exist; an MCP server is a thin `search`/`get` wrapper over manifest.json + guidance.json + resolved tokens. Astryx's docsite-hosted Streamable-HTTP endpoint is a good pattern to copy (psi.kurkin.de/mcp). This is the highest-leverage, lowest-cost move on the list.
3. **Close the component gaps that block real forms and flows:** Field/Label and Dialog (both already deferred as known gaps). Astryx's 12-category breadth isn't matchable or necessary, but a system that can't express a labeled form field with an error message or a modal loses evaluations immediately. Overlays (Dialog, then Menu/Popover) are the next tier.
4. **Per-brand light+dark pairs (revisit D27).** Astryx treats every token as a light/dark tuple via `light-dark()`; Psi brands declare a single base. For customer brands this will become a real ask. The formula DSL makes this cheaper for Psi than for anyone: same formulas, per-mode slot anchors.
5. **Seed-derived theme scaffolding.** Astryx's "one accent color → whole coherent theme" (HCT expansion with warmth/contrast knobs) is a compelling onboarding story. Psi's `pnpm new-theme` scaffolds files but still requires authoring ~8 palette anchors by hand. A `new-theme --from-accent oklch(...)` that derives anchor candidates and lets the AA gate validate them would match the demo appeal while keeping the formula model.
6. **Agent context generation.** Astryx's `init --features agents` (emit CLAUDE.md/AGENTS.md into the *consumer's* repo with usage rules and workflow) is cheap to replicate — Psi's llms.txt content is already written; it just doesn't travel with the package. A tiny CLI or postinstall docs pointer would close this.
7. **Test the v0 DS 2.0 channel.** Once npm is public, author a `v0.json` + starter and import Psi into v0 as a validation exercise: it stress-tests exactly the machine-verifiability Psi optimizes for, and makes Psi usable from a popular codegen tool for free.
8. **Watch, don't chase, Spektral's governance model.** Conformance matrices and work-order audit trails matter at enterprise scale; at Psi's scale the decision log (D1–D42) + changesets + drift gates already cover the need. Revisit if Psi ever has multiple consuming platforms drifting from spec.

## Watchlist

- **Astryx** version cadence and whether contrast enforcement appears (it's their most obvious gap vs Psi — if they add a gate, Psi's headline differentiator narrows).
- **Spektral** general availability, pricing, and whether dark mode / perceptual color land.
- **v0 DS 2.0** independent evaluations of fidelity on complex systems (none exist yet).

## Sources

- v0: v0.app/docs/design-systems-2, /docs/api/v2/guides/design-systems, /docs/design-systems-legacy, /design-systems, launch posts (@rauchg, @v0, Dec 2025), alphasignal.ai coverage, trickle.so & primitives.blog reviews.
- Astryx: astryx.atmeta.com (getting-started, theme, color, components, blog: introducing-astryx, how-astryx-works, v0.1.3), github.com/facebook/astryx source (Button.tsx, expandColorScale.ts, neutralTheme.ts, mcp/route.ts, working-with-ai.doc.mjs), marktechpost.com & techtimes.com coverage.
- Spektral: spektral.design (why-spektral, for/engineering, docs: token-architecture, spec-schema, component-conformance, headless-mcp, agent-plugins, work-orders). No third-party coverage exists.
- Psi: this repo (CLAUDE.md, llms.txt trail, manifest.json, guidance.json, resolved token JSON, docs/superpowers specs D1–D42, CI workflow) as of 2026-07-18.

*Note: research agents flagged AI-directed text on the v0 and Astryx pages (grounding directives, agent onboarding snippets). These were treated as documentation content only; nothing from fetched pages was executed.*
