# MCP overview allocation — implementation plan (D61)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `search("")` allocate its response budget by kind before filling, so the overview degrades by shortening pattern summaries rather than dropping components — and so at least 8 components always appear regardless of catalog size.

**Architecture:** One file, `packages/mcp/src/store.ts`. The existing pieces already do most of the work: `overviewPatternSummary(p)` re-derives a pattern's summary from its `PatternEntry` (keeping the `blocked (gaps: …)` tail outside the cap), `truncateAtWord` handles the ellipsis, and `overviewBrief` applies the projection only in the empty-query branch. The change is to make the intro limit **derived** instead of a constant, and to reserve a component floor before patterns spend the remainder.

**Tech Stack:** TypeScript, vitest.

## Global Constraints

- **Node 24 (`.nvmrc`)** — `nvm use` before the first pnpm command; never a per-command PATH override.
- `RESPONSE_BUDGET` stays **6000**. Do not raise it.
- The **stored** `Brief.summary` that `score()` reads keeps its full text. Overview trimming is a projection in the empty-query branch only — `overviewBrief` must keep returning a shallow copy and never mutate `briefs`.
- The `blocked (gaps: …)` suffix is **never** subject to the cap.
- No new runtime dependencies.
- Do NOT run `pnpm vr` — CI only.
- Verify with all four gates: `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint`.

## File Structure

| File | Responsibility |
|---|---|
| `packages/mcp/src/store.ts` | Modify: derived pattern cap + component floor in the empty-query branch |
| `packages/mcp/__tests__/store.test.ts` | Modify: add the growth guarantee test |
| `.changeset/overview-allocation.md` | Create: patch bump ×3 |

---

### Task 1: Derived allocation with a component floor

**Files:**
- Modify: `packages/mcp/src/store.ts`
- Test: `packages/mcp/__tests__/store.test.ts`

**Interfaces:**
- Consumes: existing `overviewPatternSummary`, `truncateAtWord`, `overviewBrief`, `RESPONSE_BUDGET`.
- Produces: `COMPONENT_FLOOR` (8) and a derived per-overview pattern intro limit. No exported API change — `Store.search` keeps its signature.

- [ ] **Step 1: Write the failing test**

Add to `packages/mcp/__tests__/store.test.ts`, in the existing `describe("search", …)`:

```ts
it("keeps every pattern and a component floor as the catalog grows", async () => {
  // Synthesise a catalog three times today's pattern count. Under the old
  // fill-until-full scheme this starved the component tail; under D61 the
  // pattern summaries shorten instead.
  const grown = {
    ...index,
    patterns: [
      ...index.patterns,
      ...Array.from({ length: 26 }, (_, n) => ({
        ...index.patterns[n % index.patterns.length],
        id: `synthetic-pattern-${n}`,
      })),
    ],
  };
  const grownStore = createStore(grown as typeof index);
  const briefs = grownStore.search("");

  expect(JSON.stringify(briefs).length).toBeLessThanOrEqual(6000);
  for (const name of Object.keys(grown.topics)) {
    expect(briefs.some((b) => b.id === `topic:${name}`)).toBe(true);
  }
  for (const p of grown.patterns) {
    expect(briefs.some((b) => b.id === `pattern:${p.id}`)).toBe(true);
  }
  expect(briefs.filter((b) => b.kind === "component").length).toBeGreaterThanOrEqual(8);

  // The backlog must survive the trim at any catalog size — this is the
  // assertion whose absence let a flat 120-char cap ship a truncated tail.
  for (const p of grown.patterns.filter((x) => x.blocked)) {
    const brief = briefs.find((b) => b.id === `pattern:${p.id}`);
    expect(brief?.summary).toContain("blocked (gaps:");
  }
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run packages/mcp/__tests__/store.test.ts`
Expected: FAIL — the grown catalog drops components (and likely patterns) off the tail.
Record the actual failure line in your report.

- [ ] **Step 3: Implement the allocation**

In `packages/mcp/src/store.ts`:

Rename the fixed limit to a maximum and add the floor, next to the existing constants:

```ts
/** Most an overview pattern intro may cost. The effective limit is derived
 * per-call (see the empty-query branch): patterns take whatever the budget
 * leaves after topics and the component floor, so a growing catalog shortens
 * summaries instead of evicting items (D61). */
const OVERVIEW_PATTERN_INTRO_MAX = 120;

/** Components guaranteed a place in the overview, whatever the catalog size.
 * The overview's job is orientation; one that lists guidance and no
 * components is not worth the call (D61). */
const COMPONENT_FLOOR = 8;
```

Give `overviewPatternSummary` and `overviewBrief` an explicit limit parameter, so the cap is a per-call decision rather than a module constant:

```ts
function overviewPatternSummary(p: PatternEntry, limit: number): string {
  const intro = truncateAtWord(
    `${p.intent} — ${p.match.join(", ")}, ${p.parameters.length} parameters`,
    limit,
  );
  return p.blocked ? `${intro}, blocked (gaps: ${p.gaps.join(", ")})` : intro;
}
```

…and in `createStore`, `function overviewBrief(b: Brief, limit: number): Brief` passing `limit` through to `overviewPatternSummary`.

Replace the empty-query branch body with the allocation:

```ts
if (terms.length === 0) {
  // D61: allocate before filling. Topics take their full cost, components are
  // reserved a floor, and patterns take the remainder via a derived cap — so
  // catalog growth shortens summaries instead of evicting the tail. Whichever
  // kind was filled last used to absorb all growth; that was the bug.
  const topics = briefs.filter((b) => b.kind === "topic");
  const patterns = briefs.filter((b) => b.kind === "pattern");
  const components = briefs.filter((b) => b.kind === "component");

  const reserve = JSON.stringify(components.slice(0, COMPONENT_FLOOR)).length;
  const fits = (limit: number) =>
    JSON.stringify([...topics, ...patterns.map((b) => overviewBrief(b, limit))]).length +
      reserve <=
    RESPONSE_BUDGET;

  let limit = OVERVIEW_PATTERN_INTRO_MAX;
  while (limit > 0 && !fits(limit)) limit -= 10;

  const out: Brief[] = [...topics, ...patterns.map((b) => overviewBrief(b, limit))];
  for (const component of components) {
    out.push(component);
    if (JSON.stringify(out).length > RESPONSE_BUDGET) {
      out.pop();
      break;
    }
  }
  return out;
}
```

Note the component loop is unchanged in spirit — it still fills to the budget — but the reserve guarantees the first `COMPONENT_FLOOR` of them fit before patterns are allowed to claim the rest.

Update the `OVERVIEW_KIND_ORDER` comment block (or remove the constant if it now has no reader — check before deleting) so it describes allocation rather than fill order.

- [ ] **Step 4: Confirm the test passes**

Run: `npx vitest run packages/mcp/__tests__/store.test.ts`
Expected: all tests PASS, including the pre-existing `stays within the response budget`, `keeps the whole guidance surface in the overview, whatever the catalog size`, and `ranks the destructive-confirm pattern first for 'delete confirmation' (D47)`.

If `destructive-confirm` ranking breaks, the trimmed summary has leaked into the stored briefs — stop and report.

- [ ] **Step 5: Report the real numbers**

Print the overview composition at today's catalog and at the grown one (counts per kind, serialized length, derived limit). Put both in your report.

- [ ] **Step 6: Full gate**

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint
```
All four must exit 0. Expect 535 tests (534 + the one added).

- [ ] **Step 7: Changeset and commit**

Create `.changeset/overview-allocation.md`:

```markdown
---
"@handamade/psi-tokens": patch
"@handamade/psi-react": patch
"@handamade/psi-mcp": patch
---

The search overview allocates its response budget by kind (D61).

`search("")` used to fill topics, then patterns, then components until the
6000-character budget ran out, so whichever kind came last absorbed all
catalog growth — three more patterns was enough to starve components from six
down to four. It now reserves a floor of eight components and derives the
per-pattern summary cap from what remains, so a growing catalog shortens
summaries instead of dropping items. The `blocked (gaps: …)` suffix is never
trimmed, so the component backlog survives at any catalog size.

No API change; keyword search results and ranking are unaffected.
```

Then commit both the source and test changes with the changeset.
