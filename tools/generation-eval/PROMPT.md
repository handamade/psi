# Generation eval — dispatch prompt

This is the exact prompt dispatched to a fresh AI agent (no prior context, no memory of this
repo) to run the DS generation eval. Copy it verbatim into a new agent session — do not
paraphrase or add repo context beyond what it grants.

Run cadence: after any recipe/doc change, and before promoting any new component's docs.
Log the result as `runs/<date>.md` (see `RUBRIC.md` for how to score it).

The primary task is a **ledger screen** (D69). It replaced a settings form, which only ever
exercised components that already existed and so could measure documentation quality but never
coverage. The ledger arc's completion criterion (D59) is a run of this task with **zero
improvisations**.

---

## The prompt

You are working in the `ds` design system repo. You may reach the design system **only**
through its machine-readable trail:

- Start at `llms.txt` (repo root) and follow it wherever it points — `packages/tokens/llms.txt`,
  `packages/react/llms.txt`, `dist/manifest.json`, `dist/guidance.json`,
  `dist/resolved/<theme>.json`, generated `docs/*.md`, and any other `dist/` artifact or README
  those files lead you to.
- **Forbidden:** component source — no reading `.tsx` or `.css` files under `packages/react/src`
  (or any package's `src/`). If a file you're about to open lives under a package's `src/`
  directory, stop and treat the question it would have answered as a gap in the docs instead.
- Everything else generated or written for humans/agents (READMEs, `dist/` artifacts, guidance
  docs, specs) is fair game.

### Build this

A **transactions screen** using the design system's React components:

- A **table** of transactions with columns Date, Payee, Category and Amount.
  Amount is a numeric column. The table is **sortable** by Date, Payee and
  Amount, and **selectable** by row.
- A **filter row** above it: a search input and a category select, with a
  dismissible chip per active filter.
- A **row-actions menu** on each row, with "View details" and a destructive
  "Void".
- **Pagination** below the table, alongside a rows-per-page select.
- A **tab set** switching between saved views (All / Flagged), the table
  belonging to the active view.
- **"View details" opens a side sheet / drawer** showing that transaction's
  fields with a Close action.
- **"Void" shows a transient confirmation** with an Undo action.
- A **bulk action bar** that appears when rows are selected, showing the count
  and a Clear selection action.
- An **empty state** for when no rows match.
- Use the system's spacing tokens/utilities for all gaps and layout spacing —
  no hardcoded pixel/rem spacing values.
- Import whatever CSS the docs say is required to make the components render
  correctly (all the stylesheets the trail tells you to import, not just the
  ones that seem obviously necessary).

Do not invent props, component names, or token names. **If the design system
has no component for something, do not hand-roll a substitute silently — build
the smallest reasonable stand-in and log it as a gap.** A `div` standing in for
a component, or a composition rebuilt from primitives when the docs describe a
pattern for it, is the single most important thing this eval measures.

### Secondary task (only if asked to run the long form)

A **Profile settings form**: name and email inputs with the email shown in its
error state, a Plan select (Free / Pro / Team), a small "Pro" tag beside the
Plan label, an Email notifications switch, a Beta features checkbox, and a
Save / Cancel button row. Apply the system's **dark theme** using whatever
mechanism the docs prescribe. This is the task earlier runs used; it is kept so
the docs-gap trend stays comparable across runs.

### Report back

When the component is built, report:

1. **Files read, in order** — the exact sequence you followed through the trail, starting from
   `llms.txt`.
2. **Every guess** — anywhere the docs were insufficient and you had to decide something
   yourself (spacing numbers, container/layout choices, theming mechanics, prop pass-through,
   size selection, variant/token choices, anything else). List each one with what you guessed
   and why. If you made zero guesses, say so explicitly.
3. **Components and props used** — every DS component you imported and, for each, every prop
   you passed, so it can be cross-checked against `dist/manifest.json` for invented props.
4. **Every improvisation** — anything you built yourself because the design system had no
   component or pattern for it: a hand-rolled element where you expected a component, a `div`
   or native element standing in for one, or a composition you assembled from primitives that
   the docs turned out to describe as a pattern. For each, say what you needed and what you did
   instead. **If you improvised nothing, say so explicitly** — that is the result this eval is
   looking for.
