# The overview's pattern rows drop the repeated title (D100)

Date: 2026-10-15. Status: **Implemented** on branch `d100-overview-pattern-cost`.

Provenance: the pattern-budget question in the 0.22 plan
(`docs/superpowers/plans/2026-10-08-psi-0.22-plan.md` §2.2, option C). D99's
`account-menu` took the catalog to 23 patterns. That is the last size at which
the MCP overview (`search("")`, D61) keeps all three of its guarantees: every
topic, every pattern, and at least `COMPONENT_FLOOR = 8` components, inside
`RESPONSE_BUDGET = 6000` bytes. The 0.22 handoff's tier 2 can add up to five
patterns (`Textarea`, `RadioGroup`, `ProgressBar`, `Disclosure`, `FileUpload`
each may need one), so this decision lands before any of them.

The number is the first free `## Decisions` entry when this branch started
(D99 was the highest).

## What's there today

Measured on `main` at 0.24.0 (`6c55fee`): 23 patterns, 14 topics, 47
components.

1. **The overview's pattern intros are already gone.** D61 derives a per-call
   cap on each pattern's intro (intent, match phrases, parameter count), the
   largest in `[0, 120]` at which every pattern fits beside the topics and the
   component floor. At 22 patterns that cap was 10 (`"Transient…"`). At 23 it
   is **0**: every pattern's overview summary is the single character `"…"`.
   D61's failure mode, "summaries get terser", is used up. What is left in a
   pattern row is all irreducible:

   ```json
   {"id":"pattern:account-menu","kind":"pattern","title":"account-menu","summary":"…"}
   ```

2. **The title repeats the id.** For a pattern, `title` is exactly the id
   after `pattern:`. It costs `,"title":""` (11 bytes) plus the id: 24 bytes
   at the real average id length of 13.3 characters, 30–31 bytes at the
   store test's `synthetic-pattern-<n>` ids. That is about a quarter of a row.
3. **No pattern is blocked today**, so no row carries the never-capped
   `blocked (gaps: …)` tail. A tier-2 pattern that ships blocked would add it
   back, which is why the envelope is measured with the real catalog's
   `blocked`/`gaps` data cycled, not with stubs.
4. **Nothing reads `title` from an overview row.** `server.ts` serialises
   `store.search(query)` as JSON and nothing else. `init` writes no overview.
   `score()` reads the stored briefs, never the overview projection.

## Measurement

Measured before deciding, with `measure-overview-envelope.ts`'s synthesis
(cyclic copies of the real catalog with fresh ids) against a scratch copy of
`store.ts` whose overview projection could drop each field. Each cell is the
last pattern count at which the floor still holds.

| Overview pattern row | floor | short ids (`syn-<n>`) | realistic ids (`synthetic-pattern-<n>`) |
|---|---|---|---|
| today: `id, kind, title, summary` | 8 | 24 | **23** |
| today | 6 | 31 | 29 |
| **drop `title`** | **8** | **35** | **32** |
| drop `title` | 6 | 44 | 40 |
| drop `title`, and `summary` when it is only `"…"` | 8 | 47 | 40 |
| drop `title`, `kind`, and the empty `summary` | 8 | ≥ 50 | ≥ 50 |

The acceptance criterion was: the floor of 8 holds through **at least 28**
patterns with realistic ids (23 now, plus the five tier 2 could add).
Dropping `title` alone reaches **32**. It needs neither of the fallbacks: the
floor stays 8 and the budget stays 6000.

What the freed bytes do at today's size: the derived cap goes back up, so the
intros return before the floor is ever touched.

| total patterns | today: components / longest summary | `title` dropped: components / longest summary |
|---|---|---|
| 22 | 8 / 11 | 8 / 30 |
| 23 | 8 / 1 (`"…"`) | 8 / 30 |
| 24 | **7** / 1 | 8 / 20 |
| 26 | 7 / 1 | 8 / 20 |
| 28 | 6 / 1 | 8 / 11 |
| 30 | 5 / 1 | 8 / 1 |
| 32 | 5 / 1 | 8 / 1 |

At 23 patterns, an agent's first call goes from 23 rows of `"…"` to 23 rows
of three or four words of intent each. The full sweep after the change is in
"Operating envelope" below.

## Decisions

- **D100 — In the empty-query overview, a pattern row is `{id, kind,
  summary}`: it carries no `title`, because the title only repeats the id
  after `pattern:`.**
  - **Overview only.** `overviewBrief()` builds the row, and it is the only
    place that changes. The stored briefs keep `title`, so `score()` ranks
    exactly as before (an exact title match still scores 10), and a keyword
    search such as `search("delete confirmation")` still returns
    `{id, kind, title, summary}` for patterns.
  - **Patterns only.** Component, topic and token rows keep their `title`.
    For a component the title is also the id after its prefix, so dropping
    it there would save bytes too, but components are the axis D61 *reserves*
    rather than the one that runs out, and this decision changes as little of
    the response as reaches the goal. Revisit with the next lever below.
  - **`overviewBrief()` finds the pattern by its id**, not by its title,
    since the row it builds has none.
  - **`Store.search()` is typed `SearchBrief[]`**, where `SearchBrief = Brief
    | OverviewPatternBrief` and `OverviewPatternBrief = Omit<Brief, "title">`.
    Both types are exported beside `Brief`. A TypeScript caller that reads
    `.title` from an overview row now has to narrow first, which is the
    point: the field is not there.
  - **`COMPONENT_FLOOR` stays 8 and `RESPONSE_BUDGET` stays 6000.** The plan's
    fallbacks (floor 6, then a larger budget) are not needed and are not
    taken.

  **Why this is the right size of change.** D61 says the overview should
  degrade by getting terser. At 23 patterns it had nothing left to make
  terser, so the next pattern would have evicted a component. Removing a
  field that carries no information is terser in the only way still
  available, and it buys nine patterns of envelope at the conservative id
  length.

  **Risk: the row shape changes.** Anything that reads `title` from an
  overview pattern row gets `undefined`. Within this repo nothing does
  (point 4 above). A hosted-MCP client sees the JSON, where the id names the
  pattern; an agent that keyed on `title` would find it in `id`. The
  `llms.txt` line that describes briefs now says so.

  Weighed and not taken:

  - **Lower the floor to 6.** Alone it reaches 29, enough, but it gives an
    agent a thinner first view of a growing system, the regression D61's
    floor exists to prevent. Not needed beside C.
  - **Raise the budget.** D61 calls 6000 not negotiable, it is documented in
    the D43 agent-access plan, and every agent would pay for it on every
    first call.
  - **Also drop `summary` when it is only `"…"`.** Measured at 40, the
    biggest further gain. Not taken now: it changes the row shape a second
    way, the `"…"` at least tells an agent the summary was cut, and 32 is
    enough. It is the first lever to pull when the realistic edge comes
    within two of the real catalog.
  - **Also drop `kind`.** It too is derivable from the id prefix, and with
    the empty summary it puts the edge past 50. But `kind` is the field an
    agent filters on, and every other row has one.
  - **Stop listing patterns in the overview** (D61's own long-term
    alternative). Still the answer at 40+ patterns, still not needed.

## Operating envelope (after D100)

`measure-overview-envelope.ts`, run on this branch (23 patterns, 14 topics,
47 components). Components / serialised bytes; bold where the floor holds.

| total patterns | short ids | realistic ids |
|---|---|---|
| 23 | **8** / 5940 | **8** / 5940 |
| 24 | **8** / 5758 | **8** / 5772 |
| 25 | **8** / 5821 | **8** / 5849 |
| 26 | **8** / 5882 | **8** / 5924 |
| 27 | **8** / 5950 | **8** / 5781 |
| 28 | **8** / 5787 | **8** / 5857 |
| 29 | **8** / 5842 | **8** / 5926 |
| 30 | **8** / 5905 | **8** / 5820 |
| 31 | **8** / 5968 | **8** / 5888 |
| 32 | **8** / 5830 | **8** / 5956 |
| 33 | **8** / 5884 | 7 / 5757 |
| 34 | **8** / 5939 | 7 / 5826 |
| 35 | **8** / 5994 | 7 / 5895 |
| 36 | 7 / 5782 | 7 / 5964 |
| 37 | 7 / 5837 | 6 / 5770 |
| 38 | 7 / 5892 | 6 / 5839 |
| 39 | 7 / 5947 | 6 / 5908 |

The floor first breaks at 33 with realistic ids and at 36 with short ids:
the same edges the scratch measurement found (32 and 35 hold). Reproduce
with `pnpm --filter @handamade/psi-mcp exec tsx scripts/measure-overview-envelope.ts`
after `pnpm build`.

**Plan with 32**, and re-measure when a blocked pattern lands, since its gaps
tail is the one part of a row no cap reaches.

## Testing

Written first, red on assertion before the change:

- **`store.test.ts`, the envelope test** now grows the catalog to **28**
  patterns (23 real, 5 synthetic): every topic, every pattern, at least 8
  components, every gaps tail, and the response within 6000 bytes. Before
  the change it got 6 components.
- **A new test pins the row shape**: no pattern row in `search("")` has a
  `title`, every pattern row still has `id`, `kind` and `summary`, components
  and topics keep their `title`, and a keyword search still returns the
  pattern's stored title.
- **"Stays within the response budget"** now also runs the empty query
  against the grown catalogs (28 and 39 patterns), not only today's.
- The past-the-envelope test stays at 39 patterns, still past the new edge.

## Out of scope

- `RESPONSE_BUDGET`, `COMPONENT_FLOOR`, `MAX_RESULTS`, `score()`.
- The stored briefs and the keyword-search response shape.
- Component, topic and token rows in the overview.
- `get(id)`.
