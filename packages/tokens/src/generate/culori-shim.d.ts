/**
 * `culori` ships no type declarations and there is no `@types/culori`
 * package. Every other file in this package that imports it (e.g.
 * `contrast-matrix.ts`) is only ever run through `tsx` — untyped
 * transpile-only — never checked by `tsc`. `src/generate` is the sole
 * subtree in this package covered by strict `tsc` (see
 * `tsconfig.build.json`, whose `include` is scoped to `src/generate` so it
 * can emit the `.d.ts` for the public `./generate` export), so it's the
 * first place a bare `culori` import hits `noImplicitAny` for real
 * (TS7016). This ambient shim unblocks that without adding a dependency
 * or touching any existing file — see the D57 Task 4 report for the full
 * trail.
 */
declare module "culori";
