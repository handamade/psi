---
"@handamade/psi-tokens": patch
"@handamade/psi-react": patch
"@handamade/psi-mcp": patch
---

Fix: `IconMoreHorizontal` is importable (D74)

0.14.0 shipped `IconMoreHorizontal` and a `row-actions` pattern whose preset
renders it:

```jsx
trigger={<IconButton aria-label="Actions" variant="ghost"><IconMoreHorizontal /></IconButton>}
```

but the icon was never re-exported from the package root, so that preset was
code no consumer could compile:

```
TS2305: Module '"@handamade/psi-react"' has no exported member 'IconMoreHorizontal'.
```

`src/index.ts` re-exports icons through a hand-written list, and the new icon
was added to `src/icons/index.ts` only. Everything in-repo stayed green: the
build compiles the barrel, and the pattern validator resolved the requirement
against the **source directory**, where the file plainly exists.

That resolution target was the actual defect. D71 added `requires` so a pattern
could not reference an affordance that does not exist, and its own comment
claimed reading the directory meant "a file that exists but was never exported
still fails to resolve" — which is the opposite of what reading a directory
does. It now resolves against the package's public export surface, so an icon
that is not importable cannot satisfy a pattern.

Two tests pin it: every icon in the barrel must be re-exported from the root,
and every rooted icon must have a file. With the export removed, three tests
fail — including the backlog-empty gate, because `row-actions` correctly goes
blocked.

Found by the D68 external consumer run against the published 0.14.0 tarball —
the second real packaging bug that gate has caught, and the second invisible to
every in-repo check.
