---
"@handamade/psi-tokens": patch
"@handamade/psi-react": patch
"@handamade/psi-mcp": patch
---

Fix: the documented stylesheet import now typechecks (D68)

```ts
import "@handamade/psi-react/styles";
```

— what every doc tells you to write — was a TypeScript error in a standard
TypeScript + Vite consumer:

```
TS2882: Cannot find module or type declarations for side-effect import
```

`vite/client` declares `*.css`, which covers the four
`@handamade/psi-tokens/*.css` imports, but `./styles` carries no `.css`
extension so the glob never matched it, and the export had no `types`
condition to fall back on. Only the undocumented `./styles.css` spelling
worked.

Both spellings now carry a `types` condition pointing at an emitted
`dist/styles.d.ts`, so either one typechecks. No API change and no runtime
change — the CSS shipped is identical.

Found by the arc's first external consumer run: a scratch npm project outside
the workspace, installing the published 0.13.0 tarballs. The bug was invisible
in-repo because pnpm links resolve the package through the filesystem and never
evaluate an export condition. `scripts/package-exports.test.ts` now guards the
conditions, the declaration's existence, and that every export target lives
under `dist/` and survives a build.
