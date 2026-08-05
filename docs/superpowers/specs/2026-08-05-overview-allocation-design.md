# MCP overview — derived per-kind allocation (D61)

Date: 2026-08-05. Status: **Draft** — follows 0.9.0.

Provenance: the D59 cycle grew the pattern catalog from 4 to 13 and broke the
MCP search overview twice in one branch. First the component tail fell from
more than five to three when the new patterns exhausted the 6000-character
budget; then the fix for that — a flat 120-character cap on pattern summaries
— truncated away the `blocked (gaps: …)` suffix, deleting the backlog signal
the cycle existed to publish. Both were caught, but by different reviewers at
different stages, and the second was introduced by the first.

The remaining state is fragile rather than wrong. Measured on 0.9.0:

| Catalog change | topics | patterns | components | bytes |
|---|---|---|---|---|
| 0.9.0 today | 13 | 13 | **6** | 5718 |
| +8 components | 13 | 13 | **6** | 5718 |
| **+3 patterns** | 13 | 16 | **4** | 5785 |
| +1 topic | 14 | 13 | **6** | 5813 |
| gaps closed (Table ships) | 13 | 13 | **7** | 5891 |

The load-bearing observation: **component growth does not affect the overview
at all** — it shows however many components fit, so more in the index changes
nothing. **Pattern growth is the sole trigger**, and three more patterns drops
components to four, below the `> 5` floor the store test asserts. Cycle 2 adds
patterns alongside every new component, so this fails on schedule.

## Decisions

- **D61 — the overview divides its budget by kind before filling, and
  degrades by shortening rather than by dropping.** `search("")` currently
  concatenates every topic brief, then every pattern brief, then spends the
  remainder on components, stopping at the first item that would exceed
  `RESPONSE_BUDGET`. Whichever kind sits last in `OVERVIEW_KIND_ORDER` absorbs
  all catalog growth, which is why components starve.

  The overview instead allocates in this order:

  1. **Topics take their full cost.** They are terse (~122 bytes), slow-growing,
     and carry rules no keyword query re-derives — `getting-started` alone
     carries the five required CSS imports.
  2. **Components are reserved a floor** of `COMPONENT_FLOOR = 8` items,
     measured at their real serialized cost rather than an assumed average.
  3. **Patterns receive the remainder**, and their per-item cap is *derived*
     from it: the largest cap in `[0, 120]` at which every pattern fits. All
     patterns always appear.
  4. **Any budget still unspent goes to components** beyond the floor.

  The `blocked (gaps: …)` suffix is **never subject to the cap**. The cap
  applies only to the intent-and-match portion; the suffix is appended
  afterwards. A pattern therefore discloses its gaps even at cap 0, which is
  what makes the backlog survivable under arbitrary catalog growth.

  Truncated summaries end in an ellipsis so an agent can tell a fragment from
  a complete phrase.

  This preserves both existing guarantees — every topic and every pattern
  appears in the overview — and adds a third: at least `COMPONENT_FLOOR`
  components appear, regardless of catalog size. The failure mode moves from
  "items silently vanish from the tail" to "summaries get terser", which is
  the correct way for an orientation response to degrade.

  Unchanged and not up for negotiation here: `RESPONSE_BUDGET` stays **6000**
  (documented in the D43 agent-access plan and asserted by the "stays within
  the response budget" test), and the **stored** `Brief.summary` that `score()`
  reads keeps its full text — overview trimming is a projection applied only
  in the empty-query branch, never to the briefs used for keyword ranking.

## Operating envelope

The three guarantees are not universal, and this spec states where they end
rather than implying they hold forever.

**The envelope is a function of per-pattern cost, not of pattern count.** The
capped intro is only part of what a pattern brief costs: a brief stores its id
twice (`id: "pattern:<id>"` and `title: "<id>"`), and neither copy — nor
`kind`, nor the never-capped gaps suffix — is compressible, so patterns with
longer ids and gap lists exhaust the budget sooner. Measured against the real
index (13 topics, components averaging 275 bytes), sweeping pattern count at
two synthetic id lengths — components / serialized bytes at each size:

| total patterns | short ids (`syn-0`, 5 chars) | realistic ids (`synthetic-pattern-0`, 19 chars) |
|---|---|---|
| 13 (0.9.0) | **8** / 5926 | **8** / 5926 |
| 19 | **8** / 5842 | **8** / 5856 |
| 21 | **8** / 5845 | **8** / 5913 |
| 23 | **8** / 5999 | 7 / 5814 |
| 25 | **8** / 5995 | 6 / 5743 |
| 29 | 6 / 5769 | 5 / 5950 |
| 33 | 5 / 5814 | 3 / 5818 |
| 39 | 3 / 5740 | 1 / 5970 |

Bold marks the sizes where the eight-component floor still holds. Reproduce
the whole sweep with:

```bash
pnpm --filter @handamade/psi-mcp exec tsx scripts/measure-overview-envelope.ts
```

It walks every size from 13 to 39 in both columns and prints where each floor
breaks. Its synthesis matches the store test's helper — cyclic duplication of
the real catalog (`index.patterns[n % len]`) with a fresh id — so every
synthetic pattern carries a real intent, match phrases and `blocked`/`gaps`
tail rather than being a stub. Byte totals are not monotonic in pattern count:
the derived intro cap steps down in tens, so each step hands back a chunk of
budget and the total sawtooths just under 6000. Read the component column, not
the byte column, for where the envelope ends.

Psi's real ids (`date-range-filter`, `settings-form-row`,
`tabbed-workspace`, …) average 14.4 characters, so **the realistic column is
the one that governs: the floor holds through 21 patterns and first breaks at
22.** An earlier draft of this spec claimed 25–28 — that is the short-id
column, reproduced above byte-for-byte, and it is optimistic for ids the
length of Psi's own. Treat 21 as the planning number and re-measure rather
than trusting it if pattern ids or gap lists grow.

Past that the arithmetic runs out: the irreducible per-pattern cost plus the
component reserve exceeds 6000 no matter how short the intros get.

Past the envelope the design **degrades gracefully rather than breaking**:
every pattern is still listed, every blocked pattern still discloses its gaps,
and components decline one at a time from the floor. Nothing vanishes silently
and the backlog is never lost.

For scale: the D59 ledger arc is expected to add five to nine patterns across
cycles 2–5, landing near 18–22. **Most of that range is inside the envelope;
the top of it is not.** 18–21 hold the floor; 22 — the arc's own upper
projection — is exactly the first size that breaks it, at 7 components. So the
arc is not on course to overrun the envelope, but it has no margin at its
upper end, which is worth knowing before cycle 2 rather than after.

Two things buy the margin back. Closing a gap *returns* budget: the
`blocked (gaps: …)` suffix disappears, and it is the most expensive
uncompressible part of a blocked pattern's brief — measured, closing all five
of today's gaps moves the edge from 22 to 24, so the floor holds through 23
instead of through 21. At today's 13 patterns it changes nothing (8 components
either way): the buy-back only shows up once the budget is actually tight,
which is precisely where it is needed. Since the arc's whole purpose is
closing those five gaps, the catalog gets cheaper per pattern as it grows. And
a pattern that needs no new component costs less than one that does. If cycle
4 or 5 finds the floor yielding anyway, that is the signal for
the shape change in the rejected alternatives, on schedule rather than as a
surprise.

**Exceeding the envelope is the signal to change the overview's shape**, not
to tune constants — see the second rejected alternative below. The store test
asserts the guarantees at 19 patterns — two below 21, the last size that holds
the floor — and separately asserts the graceful degradation at 39, so the
boundary is documented in executable form rather than in prose alone. Both
tests use the long synthetic ids, i.e. the conservative column.

## Alternatives rejected

- **Raise the budget.** 6000 is a published contract with its own test, and
  raising it enlarges every agent's first call for a problem that recurs at
  the next catalog milestone anyway.
- **Stop enumerating patterns in the overview** — return counts plus only the
  gapped ones, with a query fetching the rest. Genuinely more scalable, and
  the right answer at 40+ patterns, but it retires the documented promise that
  guidance never falls off the end. Revisit when the derived cap is pinned at
  0 and still not fitting; that is the signal this shape has run out.
- **Lower the `> 5` component assertion.** Concedes the regression: an agent's
  first call gets a thinner view of the system precisely as the system grows.

## Testing

The store test gains two assertions about growth, not just today's catalog:

- **Inside the envelope (26 patterns, double 0.9.0):** all topics and all
  patterns appear, at least `COMPONENT_FLOOR` components appear, and every
  blocked pattern still discloses its gaps. That last one is the assertion
  whose absence let the 120-character cap ship a truncated backlog.
- **Past the envelope (39 patterns):** the response stays within budget, all
  patterns still appear, and every blocked pattern still discloses its gaps —
  but the component floor is *not* asserted, because it provably cannot hold
  there. This test exists to pin the degradation as deliberate rather than
  accidental; if a future change makes patterns start vanishing instead, it
  fails.

The existing assertions stay as they are: response ≤ 6000, every topic and
pattern present, `destructive-confirm` still ranks first for "delete
confirmation" (proof that ranking reads untrimmed summaries).

## Out of scope

- Any change to `RESPONSE_BUDGET`, `MAX_RESULTS`, or the scoring function.
- The shape of `get(id)` responses.
- Token briefs, which the overview already omits by design (they are
  discoverable by query).
