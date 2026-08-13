# TODOS

Deferred work with enough context to pick up cold. Each entry says what, why,
what it costs, and what it depends on. An entry without context is worse than no
entry — it creates false confidence that the idea was captured while losing the
reasoning.

---

## CSS-variables fallback for the contrast-report tool

**What:** When a theme's palette values are `var(--mui-palette-*)` rather than
literal colours, read the resolved values instead of reporting every token as
NOT MEASURED.

**Why:** MUI v6+ ships an opt-in `cssVariables: true` mode that turns *every*
palette entry into a `var()` reference. `tools/contrast-report/parse.ts` cannot
resolve those, so 7A's honest-failure path fires for the whole theme: the
prospect gets a report where nothing was measured. Nothing is wrong or
misleading about that output, but it is useless to that person, and with only
five planned contacts one wasted report is 20% of the experiment.

**Pros:** Covers a whole class of modern MUI consumer. Turns a dead report into
a live one.

**Cons:** Speculative until a real prospect sends a `var()`-only palette. Costs
half a day for a mode that is opt-in and not the default.

**Context:** Two viable mechanisms. (1) The local runner from Tension 3A already
executes on the prospect's machine, so it can call `getComputedStyle` on a
rendered root and read the resolved custom properties directly — this is close
to free once the runner exists, which is the main reason not to build a separate
path now. (2) Ask for the emitted `:root { --mui-palette-*: … }` block instead of
the palette object. Prefer (1).

**Depends on / blocked by:** The local runner (Tension 3A), which is itself built
on first reply. Do not build this before a prospect actually hits the case.

**Source:** `/plan-eng-review` 2026-08-13, Codex outside voice — "MUI css variable
mode remains a live blocker. Reporting `var()` as NOT MEASURED may exclude the
exact tokens modern MUI users rely on."

---

## Delivery formats beyond markdown

**What:** Emit the AA proof report as something other than a markdown file — CSV,
CI output, SARIF, GitHub annotations, or a token patch the buyer can apply.

**Why:** A markdown report is a document you read once. A SARIF file or a CI
check is something that keeps failing until it's fixed, which is the difference
between a one-off favour and a thing they install.

**Pros:** Turns the wedge artifact into the beginning of Approach C. SARIF in
particular plugs into GitHub code scanning with no work on their side.

**Cons:** Entirely premature. Nobody has received the markdown version yet, and
picking a format before anyone has asked for one is guessing.

**Context:** Raised by Codex during plan review. Defer until at least one
recipient has read a markdown report and said what they'd want to do with it.
The answer is likely to come from them, not from us.

**Depends on / blocked by:** At least one delivered report (Success Criterion 3).

**Source:** `/plan-eng-review` 2026-08-13, Codex outside voice.
