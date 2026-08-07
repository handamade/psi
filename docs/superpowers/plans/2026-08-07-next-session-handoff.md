# Handoff — 2026-08-07 → next session

## State (verify these first; they are cheap and they go stale)

| What | Value |
|---|---|
| `main` | `0872f8a` — eval run (b), arc closed |
| npm `latest` | **0.14.2**, matching `main` |
| Open PRs | none |
| Pending changesets | none |
| Highest **claimed** decision | **D75** → claim **D76** |
| Components / patterns | 34 / 13, zero blocked |

```sh
git fetch origin && git log --oneline origin/main -1
node -e "console.log(require('./packages/react/package.json').version)"
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint   # four gates
```

Confirm D76 is free with a `## Decisions` entry check, not a grep — a grep
returns forward references. `2026-08-07-verify-published-cycle-design.md` holds
D75.

## Done this session (D68–D75, releases 0.13.1 → 0.14.2)

The **ledger coverage arc is closed.** `tools/generation-eval/runs/2026-08-07-b.md`
returned **zero improvisations**, D59's completion criterion. Component count
went 21 → 34 as an output, never a target.

Shipped: `DescriptionList`/`DescriptionItem`, `IconMoreHorizontal`, pattern
`requires` declarations (D71), the manifest's `children` for 31 of 34
components (D72), `aria-*` in patterns (D73), and `pnpm verify:published`
(D75).

## Next: D76 — four documentation gaps from the final eval run

Ordinary docs work, no design decisions needed. Smallest first:

1. **`onSortChange`'s contract is undocumented.** The eval agent read
   `dist/index.js` to learn whether it emits the current or the already-toggled
   direction. It emits the *next* state. Put that in `docs/Table.md` and
   `llms.txt`. **The substantive one.**
2. **`data-table` never says what the actions column's `<th>` should contain.**
   Two runs have now hit this.
3. **Spacing guidance stops at forms.** `llms.txt` gives 24/12/8 for fields,
   toggle groups and button rows, and nothing for page-level layout.
4. **`Pagination` is silent at the `pageCount` boundaries** — `page >
   pageCount` after filtering, and `pageCount === 0`.

Also recurring, smaller: the N-controlled-`Menu` idiom is undocumented, and
`.psi-m-0` is undiscoverable (one run used it, the next used inline
`margin: 0`).

## The one open question worth deciding before trusting the eval further

**The eval currently measures the repo, not the published trail.** The agent is
context-free but runs *inside* the repo, so `CLAUDE.md` loads — and `CLAUDE.md`
states the px size vocabulary, the flat variant list, the no-hardcoded-colours
rule and the five-stylesheet rule, several of which the eval nominally
measures. Every run so far shared that condition, so the trend is internally
comparable, but "zero hard fails" is a property of the repo.

`pnpm verify:published` now makes the strict version cheap: run the ledger task
in a scratch project with the packages installed from npm and no repo present.
Worth doing before treating the clean result as settled.

## Two habits this session paid for; keep them

- **After every publish, run `pnpm verify:published`.** It has caught two real
  packaging bugs invisible to all five CI gates (D68, D74). D74 shipped in two
  releases because this step was manual and got skipped.
- **A guard is verified only by reproducing the failure it was built for, on
  the real artifact — and re-verified after any change to the guard.** Three
  separate checks this session had working mechanisms and wrong targets: D70's
  `children` diagnosis, D71's icon roster (which had a *passing* removal test
  and still shipped the bug), and two drafts of `verify-published` itself.

## Environment notes

- **VR needs `PSI_VR_CHROMIUM`** in this container — the pinned Playwright build
  is absent, only chromium-1194 is present. Expect **16** known token-specimen
  divergences; read the failure *count*, not the tail. Details in
  `apps/storybook/vr/README.md`.
- **Downloading CI artifacts is blocked** by the agent proxy (403 on
  `api.github.com`). Do not route around it.
- **GitHub Actions was degraded 08-06 into 08-07** — ~15h with no runs created
  repo-wide. Recovered. Signature and probe recipe are in the cycle-6 handoff.
