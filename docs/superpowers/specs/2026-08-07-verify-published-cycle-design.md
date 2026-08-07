# `verify:published` — the external consumer run becomes a script (D75)

Date: 2026-08-07. Status: **Draft**.

Provenance: D68 made the external consumer run a standing post-release gate.
It then caught a second real bug (D74) — but only because a human asked "please
check again", and only after two releases had shipped it. A gate that depends
on remembering is not a gate.

## Decisions

- **D75 — The external consumer run is `pnpm verify:published`, and it compares
  what the package *tells you to write* against what it *lets you import*.**

  `tools/verify-published.mjs` scaffolds a scratch npm project outside the
  workspace, installs the published tarballs, and asserts:

  1. `LICENSE` ships in both packages (#54's fix, which nothing in-repo checks).
  2. All **five** stylesheets resolve through the published `exports` map.
  3. **Every identifier rendered by a published preset is exported.**
  4. Every export in the published `index.d.ts` imports and typechecks, with
     values referenced at runtime so a type-only name with no JS backing fails
     the bundle.
  5. `tsc --noEmit` under `moduleResolution: "bundler"` — the mode the D68 bug
     appeared in — and a real `vite build`.

  Not a CI step, for the reason D68 already gave: it needs a *published*
  version, so wiring it into `ci` would test stale versions or block on npm.
  Run it after every `pnpm release`.

  **Check 3 is the one that matters, and getting there took two attempts.**
  The obvious design — import every export and typecheck — cannot catch D74.
  `IconMoreHorizontal` was missing from 0.14.0's `index.d.ts` *as well as* from
  its JS, so the package was entirely self-consistent: everything it claimed to
  export, it exported. Importing its own surface passes.

  The defect lived in the gap between two published artifacts: `patterns.json`
  told consumers to write `<IconMoreHorizontal />` while `index.d.ts` offered no
  such name. Nothing that reads one artifact alone can see it. So the check
  parses every non-null `preset`, extracts each JSX identifier, and requires it
  in the export surface — both sides read from the installed tarball.

  This generalises past icons: any future pattern whose preset names a
  component that is not re-exported fails here, and names the pattern.

## Verified against the bugs, not just against green

The script passes on 0.14.2 and **fails on both releases that were actually
broken**, with the specific diagnosis in each case:

| Version | Result |
|---|---|
| 0.14.2 | passes |
| 0.14.0 | `FAIL — every identifier in a published preset is exported: IconMoreHorizontal (row-actions)` |
| 0.13.0 | `FAIL — tsc: TS2882 ... '@handamade/psi-react/styles'` |

This mattered. An intermediate version of the script made the smoke composition
adapt to whatever a release exports, so it would not fail on components that did
not exist yet — a reasonable change that **silently destroyed the D74
detection**, because the adaptive check skipped the very identifier it existed
to catch. It passed 0.14.0 clean. Only re-running the historical cases caught
it.

That is the second time this session a guard has been confirmed by its
mechanism while its premise was wrong (see the D74 note in
`2026-08-07-pattern-affordances-cycle-design.md`). The rule this cycle adopts:
**a guard is verified only by reproducing the failure it was built for, on the
real artifact — and re-verified after any change to the guard.**

## Gates

All four. No package changes, so no changeset: the script is a repo tool and
the root `package.json` is not published.

## Out of scope

- **Running it in CI.** See above.
- **Checking `guidance.json` or `llms.txt` prose against the export surface.**
  Presets are code and can be parsed exactly; prose cannot, and a
  false-positive gate that must be argued with will be disabled.
