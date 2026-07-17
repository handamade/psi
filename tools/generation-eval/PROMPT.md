# Generation eval — dispatch prompt

This is the exact prompt dispatched to a fresh AI agent (no prior context, no memory of this
repo) to run the DS generation eval. Copy it verbatim into a new agent session — do not
paraphrase or add repo context beyond what it grants.

Run cadence: after any recipe/doc change, and before promoting any new component's docs.
Log the result as `runs/<date>.md` (see `RUBRIC.md` for how to score it).

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

A **Profile settings form** using the design system's React components:

- A **name** input and an **email** input. Show the email input in its error state as a
  worked example (i.e., render one instance of the form, or a second field, demonstrating what
  an invalid/error email input looks like).
- A **Plan** select with options Free / Pro / Team.
- A small **"Pro"** tag placed next to the Plan field's label.
- An **Email notifications** switch.
- A **Beta features** checkbox.
- A button row: **Save** as the primary action, **Cancel** as the secondary action.
- Apply the system's **dark theme** to the form, using whatever mechanism the docs prescribe.
- Use the system's spacing tokens/utilities for all gaps and layout spacing — no hardcoded
  pixel/rem spacing values.
- Import whatever CSS the docs say is required to make the components render and themed
  correctly (all token stylesheets the trail tells you to import, not just the ones that seem
  obviously necessary).

Do not invent props, component names, or token names. If the docs don't tell you something you
need, make the smallest reasonable guess and **log it** — don't silently pick an answer.

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
