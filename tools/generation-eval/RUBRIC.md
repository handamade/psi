# Grading rubric

Hard fails: any invented prop (cross-check every prop against dist/manifest.json) · any hardcoded color · any off-vocabulary size (S/M/L) or variant name.

Three counted quantities, and they mean different things:

- **Hard fails** — as above. Pass = zero.
- **Guesses** — anywhere the docs were insufficient and the agent decided for itself. A guess on
  a topic covered by llms.txt Compositions = docs bug, file it. Count and list every guess the
  agent reports; compare against the previous run in runs/. Trend goal = assessed docs-gap count
  monotonically ↓ (log both reported and assessed counts).
- **Improvisations** (D69) — a hand-rolled element where a Psi component exists, a `div` or
  native element standing in for a component, or a composition rebuilt from primitives that
  `dist/patterns.json` already describes. **This is a coverage gap, not a docs gap**, and it is
  the ledger arc's completion criterion (D59): the arc is done when the ledger task returns a
  run with **zero improvisations**.

Do not merge the last two. A guess means the system could express the thing and failed to say
how; an improvisation means it could not express the thing at all. They have different fixes —
a doc change versus a component — and collapsing them hides which one a run is reporting.

Assess improvisations at review rather than trusting the agent's own count, the same way guesses
are assessed: an agent may not recognise that what it hand-rolled has a pattern, and it may
report a legitimate app-level choice as an improvisation. A third-party chart is **correct
behavior, not an improvisation** — Psi ships no chart components by permanent decision (D59
out-of-scope), so a run that reaches for one is following the rules.
