# Composition contracts — slot contracts, token scopes, patterns (D45–D48)

Date: 2026-07-18. Status: **Adopted** — D45 slot contracts shipped in 0.5.0;
D46 token scopes, D47 patterns, and D48 contract validator shipped in 0.6.0
(2026-07-20). The adoption-order sequencing below is now historical record.

Provenance: shape borrowed from the AINDF spec
(<https://github.com/0leg-design/ai-native-design-framework>, MIT, Draft 0.1).
Deliberately **not** adopted as a dependency — AINDF ships no validator, no
tooling, and a fixed 4-layer taxonomy that doesn't match Psi. We steal three
mechanisms and express them in Psi's existing generated-artifact pipeline:

1. **Slot contracts** — what nests where, declared and lintable.
2. **Token scopes** — which properties a token may bind to, enforced.
3. **Patterns with clarifying parameters** — parametrized composition recipes
   an agent interrogates before generating code.

Everything follows the house rule that made D43 cheap: author once in `src`,
generate every downstream artifact (manifest, MCP index, lint config, docs),
never hand-maintain what can drift.

## Decisions

- **D45 — Slot contracts are authored per component and merged into
  manifest.json.** Today `packages/react/dist/manifest.json` describes props
  only; composition ("what may go inside a Dialog footer?") lives in prose and
  in agents' imaginations. Each component that accepts structured children
  gains an authored `slots.json` next to its source
  (`packages/react/src/<Component>/slots.json`), declaring per slot: `accepts`
  (component names and/or abstract contracts), `cardinality`
  (`0..1 | 1..1 | 0..* | 1..*`), and `order`. The manifest build merges these
  into each component's manifest entry; the build fails on a slot referencing
  a component that doesn't exist in the manifest (no dangling edges). Leaf
  components (Button, Tag) declare nothing and get `"slots": []` — absence is
  explicit, not unknown. Abstract contracts (e.g. `interactive`,
  `inline-content`) are declared once in `packages/react/src/contracts.json`
  as named component sets, so a slot can accept a capability without
  enumerating components at every use site. We do **not** adopt AINDF's fixed
  atoms/elements/blocks/sections layer axis: Psi's inventory is one flat tier
  of primitives plus a few composites, and a mandatory 4-layer taxonomy would
  be ceremony. If layering ever earns its keep, it can be added as a manifest
  field without breaking this schema.

- **D46 — Tokens declare scopes; the token build is the primary gate,
  stylelint the secondary.** A *wrong* token on a property —
  `--psi-fg-muted` as a background — is legal CSS and an illegal design
  decision, and nothing catches it today. Token sources in
  `packages/tokens/src` gain an optional `scopes` array (CSS property names /
  property groups the token may bind to, e.g. `["color", "fill", "stroke"]`
  for text colors). Crucially, in Psi the semantic-token → property binding
  does **not** happen in CSS: component CSS may only use
  `--psi-<component>-*` and scale tokens (the existing stylelint rule
  enforces that), so the real binding site is
  `packages/tokens/src/components/*.ts`
  (`"accent-bg": "var(--psi-fill-accent)"`). The **token build** is therefore
  the primary enforcement point: a component token may only reference
  semantic tokens whose scopes match the property group its own name
  declares. This makes the `-bg` / `-fg` / `-border` suffix convention
  normative (the suffix → property-group map ships with the build), and the
  check follows references through `oklch(from var(--psi-...) ...)`
  derivations. Violations throw — same posture as the WCAG contrast gate.
  Secondary gate: scopes are emitted into `dist/resolved/<theme>.json` and
  DTCG `$extensions.psi`, and the build generates a scope map consumed by the
  stylelint plugin, so *consumer* CSS binding a scoped token to an
  out-of-scope property is a lint error. Unscoped tokens stay valid
  everywhere (adoption is incremental — scope the high-risk families first:
  text colors, surface colors, gaps). This matches AINDF's own posture:
  scopes live in the token source and are checked by a validator, not a
  linter.

- **D47 — Patterns are parametrized composition recipes with clarifying
  parameters, and `gaps` drive the backlog.** A pattern composes existing Psi
  components into a named, reusable arrangement (settings form row, dialog
  with destructive confirm, filter toolbar) and — the part worth stealing —
  declares the questions an agent must ask **before** generating code:
  `parameters: [{ key, ask, options, default }]`. Patterns are authored as
  JSON in `packages/react/patterns/*.json` against a `pattern.schema.json`
  shipped in-repo. Fields: `id`, `intent` (one-line human goal), `match`
  (trigger phrases for intent search), `compose` (a node tree referencing
  manifest components, their slots per D45, and props constrained to the
  literal unions the manifest already carries), `parameters`, `content`
  (copy placeholders the agent fills), and `gaps` — components the pattern
  needs that Psi hasn't built. A pattern with gaps is valid but marked
  `blocked` in the index; the gaps list is the machine-readable backlog
  (today it would name Field/Label and Dialog, agreeing with the 0.5 plan —
  that agreement is the sanity check). A pattern with zero unbound parameters
  and zero gaps may additionally ship rendered copy-paste JSX as a *preset* —
  generated from the compose tree, never hand-written.

- **D48 — One contract validator, run as part of `pnpm build`, same posture
  as the contrast gate.** A single validation pass
  (`tools/validate-contracts.mjs` or equivalent) checks the whole graph and
  throws on: slot `accepts` naming an unknown component or contract; a
  contract in `contracts.json` naming an unknown component; a pattern
  `compose` node referencing an unknown component, an undeclared slot, a prop
  value outside the manifest's literal union, or filling a slot in violation
  of its D45 contract; a pattern parameter referenced in `compose` but not
  declared (or vice versa); a `scopes` entry that is not a known CSS property
  or declared group. Parameter substitution is typed at the declaration site:
  a parameter's `options` must be a subset of the manifest literal union of
  every prop site its `{param:*}` placeholder fills (e.g. `[32, 40]` ⊆
  Button's sizes); the placeholder string itself is then satisfied by that
  check, not type-checked in place. `gaps` entries are exempt by design — they are the one
  legal kind of dangling reference, and the validator prints them as a
  report, not an error. This mirrors the token build's philosophy: the build
  is the conformance gate, so a green build *is* the conformance claim.

## Architecture

### Authoring surfaces (all in `src`, all human-authored)

```
packages/react/src/<Component>/slots.json   — per-component slot contracts (D45)
packages/react/src/contracts.json           — named abstract contracts (D45)
packages/tokens/src/** (scopes field)       — token scopes inline (D46)
packages/react/patterns/*.json              — patterns (D47)
packages/react/patterns/pattern.schema.json — the pattern schema (D47)
```

### Generated surfaces (never edited by hand)

- `packages/react/dist/manifest.json` — gains `slots` per component (D45).
- `packages/tokens/dist/resolved/<theme>.json` + DTCG `$extensions.psi` —
  gain `scopes` (D46).
- Stylelint scope map — generated by the token build, consumed by the custom
  plugin (D46).
- `packages/react/dist/patterns.json` — validated, gap-annotated pattern
  index; presets' JSX rendered here (D47).
- psi-mcp bundled index — ingests all of the above at publish (see below).

### Schema sketches

Slot contract (`slots.json`):

```json
{
  "slots": [
    {
      "name": "footer",
      "accepts": { "components": ["Button"], "contracts": ["inline-content"] },
      "cardinality": "0..*",
      "order": 2
    }
  ]
}
```

Abstract contracts (`contracts.json`):

```json
{
  "interactive": ["Button", "Tag"],
  "inline-content": ["Tag", "IconButton"]
}
```

Pattern (abridged):

```json
{
  "id": "destructive-confirm",
  "intent": "Dialog confirming a destructive action",
  "match": ["delete confirmation", "are you sure", "destructive dialog"],
  "compose": {
    "component": "Dialog",
    "slots": {
      "footer": [
        { "component": "Button", "props": { "variant": "ghost" }, "content": "cancel-label" },
        { "component": "Button", "props": { "variant": "danger", "size": "{param:size}" }, "content": "confirm-label" }
      ]
    }
  },
  "parameters": [
    { "key": "size", "ask": "Button size?", "options": [32, 40], "default": 32 }
  ],
  "content": { "cancel-label": "Cancel", "confirm-label": "<verb the object>" },
  "gaps": ["Dialog"]
}
```

House rules apply inside patterns exactly as everywhere else: sizes are px
literals from the manifest union, variants are the flat vocabulary, one
`accent` per visual group, `danger` only on destructive actions. The validator
enforces the mechanical parts; guidance.json keeps carrying the intent.

### psi-mcp exposure (extends D43's two tools, adds none)

- `search(query)` — pattern `intent` + `match` phrases join the keyword index;
  pattern briefs are `id` + intent + parameter count + `blocked` flag.
- `get(id)` — a pattern id returns the full recipe: compose tree, the
  clarifying questions (the agent is expected to ask them, or accept
  defaults, before emitting code), content placeholders, gaps. A component id
  now also returns its slot contract; a token id now also returns its scopes.
- `init`-generated AGENTS.md (D44) gains one house rule: *before composing
  multi-component UI, `search` for a matching pattern and ask its clarifying
  parameters; only freehand when no pattern matches.*

## Testing

- Validator unit tests: one fixture per D48 error class + a gaps-only fixture
  that must pass with a report.
- Manifest merge test against real component sources (same posture as
  psi-mcp's index-builder tests — real `dist`, not fixtures — so a manifest
  format change breaks loudly in CI).
- Scope gates: token-build binding checks (positive/negative per scoped
  family, including through `oklch(from …)` derivations) + stylelint consumer
  rule cases.
- Preset JSX rendering: snapshot per fully-bound pattern; re-render must be
  byte-identical (generated artifact discipline).
- `check-docs-drift.mjs` extended: pattern count in docs matches
  `patterns.json`.

## Release mechanics

Nothing in this spec ships until adopted into a numbered release. Adoption
order is deliberately incremental and each step is independently valuable:

1. **D46 token scopes** — smallest diff, immediate build-gate value, zero
   API surface.
2. **D45 slot contracts** — becomes meaningful the moment Dialog (the first
   truly slot-heavy component) lands in 0.5.
3. **D47/D48 patterns + validator** — after 0.5 closes the Field/Label and
   Dialog gaps, seeded with the compositions the market report showed agents
   actually ask for.

## Out of scope

- AINDF conformance (`conformsTo: "aindf@0.1"`) — we are shape-compatible on
  purpose but claim nothing; revisit only if AINDF grows an ecosystem.
- A layer taxonomy (atoms/elements/…) — see D45.
- A `renderTarget` axis (`inline | overlay`) — AINDF's other fixed axis,
  deliberately not adopted even though Dialog (0.5) will be Psi's first true
  top-layer component (Tooltip is CSS-positioned, not portalled). Slot
  `accepts` is an allowlist: a component participates in inline composition
  only if a slot or contract names it, so overlay surfaces are excluded from
  layout slots by construction — the validator needs no axis to keep a Dialog
  out of a Card body. What remains is semantics ("renders in the top layer;
  compose the trigger, not the surface"), and that is guidance.json's job. If
  composition ever needs the *set* of overlay components (a pattern accepting
  "any overlay surface"), contracts.json already expresses it as a named
  contract with zero schema change; a per-component manifest field is the
  fallback only if membership must live next to the component. Revisit when
  Dialog's `slots.json` is authored. This sequence — allowlist exclusion by
  default, guidance for semantics, a named contract when composition needs
  the set, a manifest field as last resort — is the template for any future
  component class this spec didn't consider.
- AINDF's modifier/applicability edge — Psi's cross-cutting variation is flat
  variant props (already literal unions in the manifest, already validated by
  D48) plus exactly one out-of-band attribute, `data-psi-theme`, which is
  theming infrastructure, not a per-component modifier vocabulary. A modifier
  system would be a second way to say what props already say.
- Write/scaffold MCP tools — D43's read-only posture stands; patterns are
  data the agent reads, generation happens in the consumer's repo.
- Figma round-trip of patterns — Figma stays a generated-values consumer.
