# Run prompt — Site-Scale & Portfolio Readiness

Paste the block below into a fresh Claude Code session started in `~/Projects/dku/ds`.

---

Implement the approved spec `docs/superpowers/specs/2026-07-09-site-scale-and-portfolio-readiness-spec.md` (Site-Scale & Portfolio Readiness, decisions D27–D36).

Process requirements:

1. Read the spec fully first, plus the core spec `docs/superpowers/specs/2026-06-12-design-system-design.md` (decision log D1–D26) so naming and conventions stay consistent. Do not re-litigate decisions already recorded in either document.
2. Create a working branch `site-scale-portfolio-readiness` off the current default branch.
3. Use the superpowers:writing-plans skill to turn the spec into `docs/superpowers/plans/2026-07-09-site-scale-and-portfolio-readiness-plan.md` — one milestone per workstream WS1–WS6, bite-sized TDD tasks with exact files, code, and commands. Have me review the plan before execution starts.
4. Execute with superpowers:subagent-driven-development (fresh subagent per task, review between tasks). Commit per task; run the workstream's quality gates before moving on.
5. Quality gates are listed at the end of the spec — treat every one as blocking. The contrast gate must pass for light, dark, acme, AND the new ember theme; the stylelint token rule must stay green after tokenizing transitions/z-index.
6. WS6 crosses repos: the portfolio pilot edits `~/Projects/dku/portfolio` (branch `ds-tokens-pilot` there; read its `AGENTS.md` first and append an activity-log entry per its rules). Vendor the generated CSS — do not add a build step to the portfolio.
7. Visual verification: use the preview tooling for promo and portfolio at 1440px and 375px; archive before/after screenshots referenced from the plan doc. The WS6 normalization table in the spec defines which small pixel shifts are intentional.
8. When all workstreams pass: update the spec status to Implemented, add the changeset (minor bump for @handamade/tokens and @handamade/react), regenerate all AI artifacts (guidance.json, DTCG, manifest, docs, llms.txt), then use superpowers:finishing-a-development-branch and stop for my review before any merge or PR.

Constraints and reminders:

- Browser floor is unchanged: Chrome/Edge 119+, Safari 18+, Firefox 128+ (OKLCH relative color).
- Pixel-true naming everywhere (ds-gap-8 = 0.5rem convention; display combos named by clamp endpoints per D28).
- The DS ships no font files and no keyframes (D29, WS3) — roles and durations only.
- Hero particles/parallax stay in the portfolio app layer; they only consume duration/ease tokens.
- If a spec requirement proves wrong in practice, stop and surface it rather than silently deviating; record any approved change as a new decision (D37+).
